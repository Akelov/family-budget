import { categoryOfSubcategory, type Lookups } from '@/shared/lib/lookups';
import type { CategoryColor, Transaction, TransactionType } from '@/shared/types/domain';

import { largestRemainderPercents } from './percent';

/** Строка отчёта: категория, подкатегория или тег с суммой и долей. */
export interface ReportRow {
  id: string;
  name: string;
  amount: number;
  percent: number;
  color: CategoryColor;
  icon: string | null;
  isArchived: boolean;
}

export interface Totals {
  rows: ReportRow[];
  total: number;
}

/** Суммы в копейках по id категории, подкатегории или тега. */
export type Sums = ReadonlyMap<string, number>;

const PALETTE_SIZE = 12;
const TAG_PALETTE: readonly CategoryColor[] = [4, 7, 10, 2, 5, 8, 11, 3, 6, 9, 12, 1];

function withPercents(rows: Omit<ReportRow, 'percent'>[]): Totals {
  const sorted = [...rows].sort(
    (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'),
  );
  const percents = largestRemainderPercents(sorted.map((r) => r.amount));
  return {
    rows: sorted.map((row, i) => ({ ...row, percent: percents[i] ?? 0 })),
    total: sorted.reduce((sum, r) => sum + r.amount, 0),
  };
}

/** Цвет палитры, сдвинутый на `offset` позиций по кругу (через 5, чтобы соседние цвета различались). */
function paletteShift(base: CategoryColor, offset: number): CategoryColor {
  const index = (base - 1 + offset * 5) % PALETTE_SIZE;
  return (index + 1) as CategoryColor;
}

function sumBy(
  transactions: readonly Transaction[],
  key: (tx: Transaction) => string | undefined,
): Map<string, number> {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    const id = key(tx);
    if (id !== undefined) sums.set(id, (sums.get(id) ?? 0) + tx.amount);
  }
  return sums;
}

/**
 * Строки отчёта по категориям из готовых сумм (их считает сервер, `report_by_category`,
 * или мок-сервер). Неизвестные id пропускаются; доли — методом наибольшего остатка.
 */
export function categoryRowsFromSums(sums: Sums, lookups: Lookups): Totals {
  const rows = [...sums].flatMap(([id, amount]) => {
    const category = lookups.categoryById.get(id);
    if (!category) return [];
    return [
      {
        id,
        name: category.name,
        amount,
        color: category.color,
        icon: category.icon,
        isArchived: category.archivedAt !== null,
      },
    ];
  });
  return withPercents(rows);
}

/**
 * Строки по подкатегориям одной категории. Подкатегории получают разные цвета: самая крупная —
 * цвет категории, остальные — следующие цвета палитры (иначе сегменты сливаются — найдено по скриншоту).
 */
export function subcategoryRowsFromSums(sums: Sums, categoryId: string, lookups: Lookups): Totals {
  const category = lookups.categoryById.get(categoryId);
  if (!category) return { rows: [], total: 0 };
  const rows = [...sums].flatMap(([id, amount]) => {
    const sub = lookups.subcategoryById.get(id);
    if (!sub || sub.categoryId !== categoryId) return [];
    return [
      {
        id,
        name: sub.name,
        amount,
        color: category.color,
        icon: null,
        isArchived: sub.archivedAt !== null,
      },
    ];
  });
  const totals = withPercents(rows);
  return {
    ...totals,
    rows: totals.rows.map((row, i) => ({ ...row, color: paletteShift(category.color, i) })),
  };
}

/** Строки по тегам; сумма строк может превышать итог операций (FR-4.6). */
export function tagRowsFromSums(sums: Sums, lookups: Lookups): Totals {
  const rows = [...sums].flatMap(([id, amount], i) => {
    const tag = lookups.tagById.get(id);
    if (!tag) return [];
    return [
      {
        id,
        name: tag.name,
        amount,
        color: TAG_PALETTE[i % TAG_PALETTE.length] ?? 1,
        icon: null,
        isArchived: false,
      },
    ];
  });
  return withPercents(rows);
}

/**
 * Отчёт по категориям (FR-4.2) из списка операций: суммы по убыванию и доли, в сумме 100%.
 *
 * @param transactions - операции периода (без удалённых)
 * @param type - расходы или доходы
 * @param lookups - справочники
 */
export function reportByCategory(
  transactions: readonly Transaction[],
  type: TransactionType,
  lookups: Lookups,
): Totals {
  const ofType = transactions.filter((tx) => tx.type === type);
  return categoryRowsFromSums(
    sumBy(ofType, (tx) => categoryOfSubcategory(lookups, tx.subcategoryId)?.id),
    lookups,
  );
}

/** Отчёт по подкатегориям одной категории (FR-4.3): доли считаются внутри категории. */
export function reportBySubcategory(
  transactions: readonly Transaction[],
  categoryId: string,
  lookups: Lookups,
): Totals {
  const category = lookups.categoryById.get(categoryId);
  if (!category) return { rows: [], total: 0 };
  const inCategory = transactions.filter(
    (tx) =>
      tx.type === category.type &&
      lookups.subcategoryById.get(tx.subcategoryId)?.categoryId === categoryId,
  );
  return subcategoryRowsFromSums(
    sumBy(inCategory, (tx) => tx.subcategoryId),
    categoryId,
    lookups,
  );
}

/** Отчёт по тегам (FR-4.6): операция с несколькими тегами учитывается в каждом. */
export function reportByTag(
  transactions: readonly Transaction[],
  type: TransactionType,
  lookups: Lookups,
): Totals {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    for (const tagId of tx.tagIds) sums.set(tagId, (sums.get(tagId) ?? 0) + tx.amount);
  }
  return tagRowsFromSums(sums, lookups);
}
