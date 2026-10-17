import { isInPeriod } from '@/features/period/model/period';
import type { Lookups } from '@/shared/lib/lookups';
import { assertValidKopecks } from '@/shared/lib/money';
import type { Budget, Period, Transaction } from '@/shared/types/domain';

export type BudgetStatusKind = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  kind: BudgetStatusKind;
  /** На сколько превышен лимит, копейки (0, если не превышен). */
  overBy: number;
}

/** Порог «Почти у лимита» в процентах (FR-7.4). */
export const WARNING_THRESHOLD_PERCENT = 80;

/**
 * Статус бюджета по копейкам, а не по округлённому проценту (FR-7.4):
 * потрачено > лимита → «Превышен»; потрачено × 100 ≥ лимит × 80 → «Почти у лимита»; иначе «В норме».
 * Поэтому 80 000,01 ₽ из 80 000 ₽ — «Превышен», хотя процент округляется до 100.
 *
 * @param spent - потрачено, копейки ≥ 0
 * @param limit - лимит, копейки > 0
 * @throws {RangeError} при некорректных суммах или нулевом лимите
 */
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  assertValidKopecks(spent, 'Потрачено');
  assertValidKopecks(limit, 'Лимит');
  if (limit === 0) throw new RangeError('Лимит бюджета должен быть больше 0');
  if (spent > limit) return { kind: 'over', overBy: spent - limit };
  if (BigInt(spent) * 100n >= BigInt(limit) * BigInt(WARNING_THRESHOLD_PERCENT))
    return { kind: 'warning', overBy: 0 };
  return { kind: 'ok', overBy: 0 };
}

/**
 * Подкатегории, входящие в бюджет: выбранные напрямую и все подкатегории выбранных
 * категорий — включая архивные и добавленные позже (FR-7.3, `budget_items`).
 */
export function budgetSubcategoryIds(budget: Budget, lookups: Lookups): Set<string> {
  return new Set(
    budget.items.flatMap((item) =>
      item.kind === 'subcategory'
        ? [item.subcategoryId]
        : (lookups.subcategoriesByCategory.get(item.categoryId) ?? []).map((s) => s.id),
    ),
  );
}

export interface BudgetView {
  budget: Budget;
  spent: number;
  remaining: number;
  /** ⌊потрачено × 100 / лимит⌋, может быть больше 100. */
  percent: number;
  status: BudgetStatus;
  hasActiveSubcategories: boolean;
}

/**
 * Считает бюджет за период семьи (FR-7.3): потрачено — сумма расходов по его подкатегориям,
 * осталось — max(0, лимит − потрачено). Каждый период считается с нуля (FR-7.5).
 */
export function computeBudget(
  budget: Budget,
  transactions: readonly Transaction[],
  period: Pick<Period, 'from' | 'to'>,
  lookups: Lookups,
): BudgetView {
  const subIds = budgetSubcategoryIds(budget, lookups);
  const spent = transactions
    .filter(
      (tx) =>
        tx.deletedAt === null &&
        tx.type === 'expense' &&
        subIds.has(tx.subcategoryId) &&
        isInPeriod(tx.date, period),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
  const hasActiveSubcategories = [...subIds].some((id) => {
    const sub = lookups.subcategoryById.get(id);
    const category = sub ? lookups.categoryById.get(sub.categoryId) : undefined;
    return sub?.archivedAt === null && category?.archivedAt === null;
  });
  return {
    budget,
    spent,
    remaining: Math.max(0, budget.amount - spent),
    percent: Number((BigInt(spent) * 100n) / BigInt(budget.amount)),
    status: budgetStatus(spent, budget.amount),
    hasActiveSubcategories,
  };
}

/** Короткое описание состава бюджета: «Продукты: Супермаркет, Рынок · Автомобиль (вся категория)». */
export function describeBudgetItems(budget: Budget, lookups: Lookups): string {
  const wholeCategories = budget.items.flatMap((item) =>
    item.kind === 'category'
      ? [`${lookups.categoryById.get(item.categoryId)?.name ?? '—'} (вся категория)`]
      : [],
  );
  const subsByCategory = new Map<string, string[]>();
  for (const item of budget.items) {
    if (item.kind !== 'subcategory') continue;
    const sub = lookups.subcategoryById.get(item.subcategoryId);
    if (!sub) continue;
    const name = lookups.categoryById.get(sub.categoryId)?.name ?? '—';
    subsByCategory.set(name, [...(subsByCategory.get(name) ?? []), sub.name]);
  }
  const parts = [...subsByCategory].map(([category, subs]) => `${category}: ${subs.join(', ')}`);
  return [...parts, ...wholeCategories].join(' · ');
}
