import { ApiError } from '@/shared/api/errors';
import { emitChange } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';
import { check, unwrap } from '@/shared/api/supabaseErrors';
import {
  type CategoryRow,
  type SubcategoryRow,
  toCategory,
  toSubcategory,
} from '@/shared/api/supabaseRows';
import type { Category } from '@/shared/types/domain';

import { validateName } from '../model/rules';
import type { CategoriesData, NewCategory } from './types';

const CATEGORY_COLUMNS = 'id, type, name, color, icon, archived_at';
const SUBCATEGORY_COLUMNS = 'id, category_id, name, archived_at';

/** Проверка названия на клиенте до запроса; уникальность всё равно гарантирует индекс в базе. */
function assertName(name: string): void {
  const error = validateName(name, []);
  if (error) throw new ApiError('validation', error);
}

async function myHouseholdId(): Promise<string> {
  const { data, error } = await supabase().rpc('my_household_id');
  check({ error });
  if (typeof data !== 'string') throw new ApiError('no_household');
  return data;
}

/** Категории и подкатегории своей семьи, включая архивные (RLS отдаёт только свою семью). */
export async function fetchCategories(): Promise<CategoriesData> {
  const sb = supabase();
  const [categories, subcategories] = await Promise.all([
    sb.from('categories').select(CATEGORY_COLUMNS).order('created_at').overrideTypes<CategoryRow[], { merge: false }>(),
    sb.from('subcategories').select(SUBCATEGORY_COLUMNS).order('created_at').overrideTypes<SubcategoryRow[], { merge: false }>(),
  ]);
  return {
    categories: unwrap(categories).map(toCategory),
    subcategories: unwrap(subcategories).map(toSubcategory),
  };
}

export async function createCategory(input: NewCategory): Promise<Category> {
  assertName(input.name);
  assertName(input.subcategoryName);
  const sb = supabase();
  const householdId = await myHouseholdId();
  const row = unwrap(
    await sb
      .from('categories')
      .insert({ household_id: householdId, type: input.type, name: input.name.trim(), color: input.color, icon: input.icon })
      .select(CATEGORY_COLUMNS)
      .overrideTypes<CategoryRow[], { merge: false }>(),
  )[0];
  if (!row) throw new ApiError('forbidden');
  const sub = await sb
    .from('subcategories')
    .insert({ household_id: householdId, category_id: row.id, name: input.subcategoryName.trim() });
  if (sub.error) {
    // Категория без подкатегории запрещена (FR-2.2): откатываем созданную категорию.
    await sb.from('categories').delete().eq('id', row.id);
    check(sub);
  }
  emitChange(['categories']);
  return toCategory(row);
}

async function changeOne(table: 'categories' | 'subcategories', id: string, values: Record<string, unknown>): Promise<void> {
  const rows = unwrap(
    await supabase().from(table).update(values).eq('id', id).select('id').overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (rows.length === 0) throw new ApiError('forbidden');
  emitChange(['categories']);
}

export function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'color' | 'icon'>>): Promise<void> {
  if (patch.name !== undefined) assertName(patch.name);
  return changeOne('categories', id, {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
  });
}

/**
 * Архив категории вместе с активными подкатегориями (одна метка времени), восстановление —
 * только тех подкатегорий, что ушли в архив вместе с ней (FR-2.4).
 */
export async function setCategoryArchived(id: string, isArchived: boolean): Promise<void> {
  const sb = supabase();
  const current = unwrap(
    await sb.from('categories').select('archived_at').eq('id', id).overrideTypes<Array<{ archived_at: string | null }>, { merge: false }>(),
  )[0];
  if (!current) throw new ApiError('not_found', 'Категория не найдена');
  const stamp = new Date().toISOString();
  if (isArchived) {
    await changeOne('categories', id, { archived_at: stamp });
    check(await sb.from('subcategories').update({ archived_at: stamp }).eq('category_id', id).is('archived_at', null));
  } else {
    await changeOne('categories', id, { archived_at: null });
    if (current.archived_at) {
      check(await sb.from('subcategories').update({ archived_at: null }).eq('category_id', id).eq('archived_at', current.archived_at));
    }
  }
  emitChange(['categories']);
}

/** Удаление: база не даст удалить при операциях или бюджетах (внешние ключи → `has_links`). */
export async function deleteCategory(id: string): Promise<void> {
  const sb = supabase();
  // Подкатегории удаляются каскадом, но на них могут ссылаться операции — тогда ошибка 23503.
  const rows = unwrap(
    await sb.from('categories').delete().eq('id', id).select('id').overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (rows.length === 0) throw new ApiError('forbidden');
  emitChange(['categories']);
}

export async function createSubcategory(categoryId: string, name: string): Promise<void> {
  assertName(name);
  const householdId = await myHouseholdId();
  check(await supabase().from('subcategories').insert({ household_id: householdId, category_id: categoryId, name: name.trim() }));
  emitChange(['categories']);
}

export function renameSubcategory(id: string, name: string): Promise<void> {
  assertName(name);
  return changeOne('subcategories', id, { name: name.trim() });
}

async function activeSiblings(id: string): Promise<{ categoryId: string; activeCount: number; isCategoryArchived: boolean }> {
  const sb = supabase();
  const sub = unwrap(
    await sb.from('subcategories').select('category_id, categories(archived_at)').eq('id', id)
      .overrideTypes<Array<{ category_id: string; categories: { archived_at: string | null } | null }>, { merge: false }>(),
  )[0];
  if (!sub) throw new ApiError('not_found', 'Подкатегория не найдена');
  const { count, error } = await sb
    .from('subcategories').select('id', { count: 'exact', head: true }).eq('category_id', sub.category_id).is('archived_at', null);
  check({ error });
  return { categoryId: sub.category_id, activeCount: count ?? 0, isCategoryArchived: Boolean(sub.categories?.archived_at) };
}

/** Последнюю активную подкатегорию архивировать нельзя (FR-2.2). */
export async function setSubcategoryArchived(id: string, isArchived: boolean): Promise<void> {
  const { activeCount, isCategoryArchived } = await activeSiblings(id);
  if (!isArchived && isCategoryArchived) throw new ApiError('validation', 'Сначала восстановите категорию');
  if (isArchived && activeCount <= 1) {
    throw new ApiError('validation', 'У категории должна остаться хотя бы одна подкатегория');
  }
  await changeOne('subcategories', id, { archived_at: isArchived ? new Date().toISOString() : null });
}

export async function deleteSubcategory(id: string): Promise<void> {
  const { activeCount } = await activeSiblings(id);
  const rows = unwrap(
    await supabase().from('subcategories').select('archived_at').eq('id', id)
      .overrideTypes<Array<{ archived_at: string | null }>, { merge: false }>(),
  );
  if (rows[0]?.archived_at === null && activeCount <= 1) {
    throw new ApiError('validation', 'У категории должна остаться хотя бы одна подкатегория');
  }
  const deleted = unwrap(
    await supabase().from('subcategories').delete().eq('id', id).select('id').overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (deleted.length === 0) throw new ApiError('forbidden');
  emitChange(['categories']);
}
