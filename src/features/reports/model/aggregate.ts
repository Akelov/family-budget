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

interface Totals {
  rows: ReportRow[];
  total: number;
}

function withPercents(rows: Omit<ReportRow, 'percent'>[]): ReportRow[] {
  const sorted = [...rows].sort(
    (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'),
  );
  const percents = largestRemainderPercents(sorted.map((r) => r.amount));
  return sorted.map((row, i) => ({ ...row, percent: percents[i] ?? 0 }));
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
 * Отчёт по категориям (FR-4.2): суммы по убыванию и доли, в сумме 100%.
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
  const sums = sumBy(ofType, (tx) => categoryOfSubcategory(lookups, tx.subcategoryId)?.id);
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
  return { rows: withPercents(rows), total: rows.reduce((sum, r) => sum + r.amount, 0) };
}

/**
 * Отчёт по подкатегориям одной категории (FR-4.3): доли считаются внутри категории.
 */
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
  const sums = sumBy(inCategory, (tx) => tx.subcategoryId);
  const rows = [...sums].flatMap(([id, amount]) => {
    const sub = lookups.subcategoryById.get(id);
    if (!sub) return [];
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
  // Подкатегории одной категории получают разные цвета: самая крупная — цвет категории,
  // остальные — следующие цвета палитры. Иначе сегменты диаграммы сливаются (найдено по скриншоту).
  const colored = withPercents(rows).map((row, i) => ({
    ...row,
    color: paletteShift(category.color, i),
  }));
  return { rows: colored, total: rows.reduce((sum, r) => sum + r.amount, 0) };
}

const PALETTE_SIZE = 12;

/** Цвет палитры, сдвинутый на `offset` позиций по кругу (через 5, чтобы соседние цвета различались). */
function paletteShift(base: CategoryColor, offset: number): CategoryColor {
  const index = (base - 1 + offset * 5) % PALETTE_SIZE;
  return (index + 1) as CategoryColor;
}

/**
 * Отчёт по тегам (FR-4.6): операция с несколькими тегами учитывается в каждом,
 * поэтому сумма строк может превышать итог операций. Доли — от суммы строк.
 */
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
  const palette: CategoryColor[] = [4, 7, 10, 2, 5, 8, 11, 3, 6, 9, 12, 1];
  const rows = [...sums].flatMap(([id, amount], i) => {
    const tag = lookups.tagById.get(id);
    if (!tag) return [];
    return [
      {
        id,
        name: tag.name,
        amount,
        color: palette[i % palette.length] ?? 1,
        icon: null,
        isArchived: false,
      },
    ];
  });
  return { rows: withPercents(rows), total: rows.reduce((sum, r) => sum + r.amount, 0) };
}
