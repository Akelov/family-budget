import { isInPeriod } from '@/features/period/model/period';
import { categoryOfSubcategory, type Lookups } from '@/shared/lib/lookups';
import { normalizeName } from '@/shared/lib/text';
import type { Transaction } from '@/shared/types/domain';

import type { TransactionFilters, TransactionQuery } from './types';

/** Сколько фильтров активно — число на кнопке «Фильтры» (FR-3.12). */
export function countActiveFilters(filters: TransactionFilters): number {
  return [
    filters.type !== null,
    filters.categoryIds.length + filters.subcategoryIds.length > 0,
    filters.tagIds.length > 0,
    filters.authorIds.length > 0,
  ].filter(Boolean).length;
}

/**
 * Подходит ли операция под фильтры.
 *
 * Категории и подкатегории — один фильтр: операция проходит, если её подкатегория выбрана
 * сама или входит в выбранную категорию.
 *
 * @param tx - операция
 * @param filters - фильтры
 * @param lookups - справочники для определения категории подкатегории
 */
export function matchesFilters(
  tx: Transaction,
  filters: TransactionFilters,
  lookups: Lookups,
): boolean {
  if (filters.type && tx.type !== filters.type) return false;
  if (filters.categoryIds.length + filters.subcategoryIds.length > 0) {
    const categoryId = categoryOfSubcategory(lookups, tx.subcategoryId)?.id;
    const bySub = filters.subcategoryIds.includes(tx.subcategoryId);
    const byCategory = categoryId !== undefined && filters.categoryIds.includes(categoryId);
    if (!bySub && !byCategory) return false;
  }
  if (filters.tagIds.length > 0 && !tx.tagIds.some((id) => filters.tagIds.includes(id)))
    return false;
  if (filters.authorIds.length > 0 && !filters.authorIds.includes(tx.authorId)) return false;
  return true;
}

/**
 * Поиск без учёта регистра по комментарию, категории, подкатегории и тегам (FR-3.11).
 * Пустая строка поиска подходит под всё.
 */
export function matchesSearch(tx: Transaction, search: string, lookups: Lookups): boolean {
  const needle = normalizeName(search);
  if (!needle) return true;
  const haystack = [
    tx.comment,
    categoryOfSubcategory(lookups, tx.subcategoryId)?.name,
    lookups.subcategoryById.get(tx.subcategoryId)?.name,
    ...tx.tagIds.map((id) => lookups.tagById.get(id)?.name),
  ];
  return haystack.some((text) => text !== undefined && normalizeName(text).includes(needle));
}

/** Порядок истории: новые дни сверху, внутри дня — по времени создания, новые сверху (FR-3.8). */
export function compareTransactions(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

/**
 * Отбирает операции по периоду, поиску и фильтрам и сортирует их для истории.
 * Удалённые (`deletedAt`) не попадают никуда.
 */
export function filterTransactions(
  transactions: readonly Transaction[],
  query: TransactionQuery,
  lookups: Lookups,
): Transaction[] {
  return transactions
    .filter(
      (tx) =>
        tx.deletedAt === null &&
        isInPeriod(tx.date, query.period) &&
        matchesFilters(tx, query.filters, lookups) &&
        matchesSearch(tx, query.search, lookups),
    )
    .sort(compareTransactions);
}
