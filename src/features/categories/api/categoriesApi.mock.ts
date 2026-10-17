import { can } from '@/features/household/model/permissions';
import { ApiError } from '@/shared/api/errors';
import { currentMember, type DbState, readDb, request, writeDb } from '@/shared/api/mockDb';
import { createId } from '@/shared/lib/id';
import type { Category, Subcategory } from '@/shared/types/domain';

import {
  activeSubcategories,
  isCategoryInUse,
  isSubcategoryInUse,
  validateName,
} from '../model/rules';
import type { CategoriesData, NewCategory } from './types';


function assertCanManage(db: DbState): void {
  if (!can(currentMember(db).role, 'categories.manage')) throw new ApiError('forbidden');
}

function nameErrorOrThrow(error: string | null): void {
  if (error === 'Такое название уже есть') throw new ApiError('duplicate', error);
  if (error) throw new ApiError('validation', error);
}

/** Все категории и подкатегории семьи, включая архивные (для истории и отчётов). */
export function fetchCategories(): Promise<CategoriesData> {
  return request(() => {
    const db = readDb();
    return { categories: db.categories, subcategories: db.subcategories };
  });
}


export function createCategory(input: NewCategory): Promise<Category> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    nameErrorOrThrow(
      validateName(
        input.name,
        db.categories.filter((c) => c.type === input.type).map((c) => c.name),
      ),
    );
    nameErrorOrThrow(validateName(input.subcategoryName, []));
    const category: Category = {
      id: createId(),
      type: input.type,
      name: input.name.trim(),
      color: input.color,
      icon: input.icon,
      archivedAt: null,
    };
    const sub: Subcategory = {
      id: createId(),
      categoryId: category.id,
      name: input.subcategoryName.trim(),
      archivedAt: null,
    };
    writeDb(['categories'], (d) => ({
      ...d,
      categories: [...d.categories, category],
      subcategories: [...d.subcategories, sub],
    }));
    return category;
  });
}

export function updateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'color' | 'icon'>>,
): Promise<void> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    const category = db.categories.find((c) => c.id === id);
    if (!category) throw new ApiError('not_found', 'Категория не найдена');
    if (patch.name !== undefined) {
      const siblings = db.categories
        .filter((c) => c.type === category.type && c.id !== id)
        .map((c) => c.name);
      nameErrorOrThrow(validateName(patch.name, siblings));
    }
    const next = {
      ...category,
      ...patch,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    };
    writeDb(['categories'], (d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? next : c)),
    }));
  });
}

/**
 * Архив и восстановление категории (FR-2.4): архив переносит в архив все активные подкатегории
 * с той же меткой, восстановление возвращает именно их.
 */
export function setCategoryArchived(id: string, isArchived: boolean): Promise<void> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    const category = db.categories.find((c) => c.id === id);
    if (!category) throw new ApiError('not_found', 'Категория не найдена');
    const stamp = isArchived ? new Date().toISOString() : null;
    const prevStamp = category.archivedAt;
    writeDb(['categories'], (d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, archivedAt: stamp } : c)),
      subcategories: d.subcategories.map((s) => {
        if (s.categoryId !== id) return s;
        if (isArchived && s.archivedAt === null) return { ...s, archivedAt: stamp };
        if (!isArchived && s.archivedAt === prevStamp) return { ...s, archivedAt: null };
        return s;
      }),
    }));
  });
}

export function deleteCategory(id: string): Promise<void> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    const category = db.categories.find((c) => c.id === id);
    if (!category) throw new ApiError('not_found', 'Категория не найдена');
    if (isCategoryInUse(category, db.subcategories, db.transactions, db.budgets))
      throw new ApiError('has_links');
    writeDb(['categories'], (d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      subcategories: d.subcategories.filter((s) => s.categoryId !== id),
    }));
  });
}

export function createSubcategory(categoryId: string, name: string): Promise<Subcategory> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    nameErrorOrThrow(
      validateName(
        name,
        db.subcategories.filter((s) => s.categoryId === categoryId).map((s) => s.name),
      ),
    );
    const sub: Subcategory = { id: createId(), categoryId, name: name.trim(), archivedAt: null };
    writeDb(['categories'], (d) => ({ ...d, subcategories: [...d.subcategories, sub] }));
    return sub;
  });
}

export function renameSubcategory(id: string, name: string): Promise<void> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    const sub = db.subcategories.find((s) => s.id === id);
    if (!sub) throw new ApiError('not_found', 'Подкатегория не найдена');
    nameErrorOrThrow(
      validateName(
        name,
        db.subcategories
          .filter((s) => s.categoryId === sub.categoryId && s.id !== id)
          .map((s) => s.name),
      ),
    );
    writeDb(['categories'], (d) => ({
      ...d,
      subcategories: d.subcategories.map((s) => (s.id === id ? { ...s, name: name.trim() } : s)),
    }));
  });
}

/** Архив подкатегории: последнюю активную архивировать нельзя (FR-2.2). */
export function setSubcategoryArchived(id: string, isArchived: boolean): Promise<void> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    const sub = db.subcategories.find((s) => s.id === id);
    if (!sub) throw new ApiError('not_found', 'Подкатегория не найдена');
    const category = db.categories.find((c) => c.id === sub.categoryId);
    if (!isArchived && category?.archivedAt)
      throw new ApiError('validation', 'Сначала восстановите категорию');
    if (isArchived && activeSubcategories(sub.categoryId, db.subcategories).length <= 1) {
      throw new ApiError('validation', 'У категории должна остаться хотя бы одна подкатегория');
    }
    const archivedAt = isArchived ? new Date().toISOString() : null;
    writeDb(['categories'], (d) => ({
      ...d,
      subcategories: d.subcategories.map((s) => (s.id === id ? { ...s, archivedAt } : s)),
    }));
  });
}

export function deleteSubcategory(id: string): Promise<void> {
  return request(() => {
    const db = readDb();
    assertCanManage(db);
    const sub = db.subcategories.find((s) => s.id === id);
    if (!sub) throw new ApiError('not_found', 'Подкатегория не найдена');
    if (isSubcategoryInUse(id, db.transactions, db.budgets)) throw new ApiError('has_links');
    if (
      sub.archivedAt === null &&
      activeSubcategories(sub.categoryId, db.subcategories).length <= 1
    ) {
      throw new ApiError('validation', 'У категории должна остаться хотя бы одна подкатегория');
    }
    writeDb(['categories'], (d) => ({
      ...d,
      subcategories: d.subcategories.filter((s) => s.id !== id),
    }));
  });
}
