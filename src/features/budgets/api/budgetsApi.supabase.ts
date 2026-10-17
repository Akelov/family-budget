import { fetchCategories } from '@/features/categories/api/categoriesApi.supabase';
import { ApiError } from '@/shared/api/errors';
import { emitChange } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';
import { check, unwrap } from '@/shared/api/supabaseErrors';
import { BUDGET_COLUMNS, type BudgetRow, toBudget } from '@/shared/api/supabaseRows';
import { num, rpcRows, str } from '@/shared/api/supabaseRpc';
import { buildLookups } from '@/shared/lib/lookups';
import { kopecksToRublesString, MAX_AMOUNT_KOPECKS } from '@/shared/lib/money';
import type { Budget, BudgetItem, Period } from '@/shared/types/domain';

import { budgetViewFromSpent, type BudgetView } from '../model/budget';
import type { BudgetInput } from './types';

/**
 * Бюджеты за период семьи: «потрачено» считает сервер (`budget_status`) по всем операциям,
 * остаток, процент и статус — общая функция model/ (та же, что в демо-режиме).
 */
export async function fetchBudgetStatuses(
  period: Pick<Period, 'from' | 'to'>,
): Promise<BudgetView[]> {
  const sb = supabase();
  const [budgetRows, statusRows, categories] = await Promise.all([
    sb
      .from('budgets')
      .select(BUDGET_COLUMNS)
      .is('archived_at', null)
      .order('created_at')
      .overrideTypes<BudgetRow[], { merge: false }>(),
    rpcRows('budget_status', { p_from: period.from, p_to: period.to }),
    fetchCategories(),
  ]);
  const spentById = new Map(statusRows.map((row) => [str(row, 'budget_id'), num(row, 'spent')]));
  const lookups = buildLookups({ members: [], tags: [], ...categories });
  return unwrap(budgetRows).map((row) =>
    budgetViewFromSpent(toBudget(row), spentById.get(row.id) ?? 0, lookups),
  );
}

function assertValid(input: BudgetInput): void {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 40)
    throw new ApiError('validation', 'Название — от 1 до 40 символов');
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > MAX_AMOUNT_KOPECKS
  ) {
    throw new ApiError('validation', 'Введите сумму больше 0');
  }
  if (input.items.length === 0)
    throw new ApiError('validation', 'Выберите хотя бы одну категорию или подкатегорию');
}

function itemRows(budgetId: string, items: BudgetItem[]) {
  return items.map((item) =>
    item.kind === 'category'
      ? { budget_id: budgetId, category_id: item.categoryId, subcategory_id: null }
      : { budget_id: budgetId, category_id: null, subcategory_id: item.subcategoryId },
  );
}

export async function createBudget(input: BudgetInput): Promise<Budget> {
  assertValid(input);
  const sb = supabase();
  const { data: householdId, error } = await sb.rpc('my_household_id');
  check({ error });
  if (typeof householdId !== 'string') throw new ApiError('no_household');
  const row = unwrap(
    await sb
      .from('budgets')
      .insert({
        household_id: householdId,
        name: input.name.trim(),
        amount: kopecksToRublesString(input.amount),
      })
      .select(BUDGET_COLUMNS)
      .overrideTypes<BudgetRow[], { merge: false }>(),
  )[0];
  if (!row) throw new ApiError('forbidden');
  const items = await sb.from('budget_items').insert(itemRows(row.id, input.items));
  if (items.error) {
    await sb.from('budgets').delete().eq('id', row.id);
    check(items);
  }
  emitChange(['budgets']);
  return { ...toBudget(row), items: input.items };
}

/** Изменение действует на все периоды (FR-7.2): состав заменяется целиком. */
export async function updateBudget(id: string, input: BudgetInput): Promise<void> {
  assertValid(input);
  const sb = supabase();
  const rows = unwrap(
    await sb
      .from('budgets')
      .update({ name: input.name.trim(), amount: kopecksToRublesString(input.amount) })
      .eq('id', id)
      .select('id')
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (rows.length === 0) throw new ApiError('forbidden');
  check(await sb.from('budget_items').delete().eq('budget_id', id));
  check(await sb.from('budget_items').insert(itemRows(id, input.items)));
  emitChange(['budgets']);
}

export async function archiveBudget(id: string): Promise<void> {
  const rows = unwrap(
    await supabase()
      .from('budgets')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (rows.length === 0) throw new ApiError('forbidden');
  emitChange(['budgets']);
}
