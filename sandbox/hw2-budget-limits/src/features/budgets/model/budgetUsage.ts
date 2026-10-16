import { assertValidKopecks } from '@/shared/lib/money';

import { NEAR_LIMIT_THRESHOLD_PERCENT } from './constants';

/** Использование лимита; все суммы — в копейках */
export interface BudgetUsage {
  /** Остаток до лимита: `max(0, limit − spent)` */
  remaining: number;
  /** Сумма превышения: `max(0, spent − limit)` */
  overspent: number;
  /** Целый процент использования (вниз), может быть > 100; `null` при лимите 0 */
  percentUsed: number | null;
  /** Строго `spent > limit` */
  isExceeded: boolean;
  /** `percentUsed >= NEAR_LIMIT_THRESHOLD_PERCENT` и лимит не превышен */
  isNearLimit: boolean;
}

/**
 * Считает, насколько использован месячный лимит категории.
 *
 * Правила:
 * - ровно 100% — ещё не превышение (`isExceeded` только при `spent > limit`);
 * - `isNearLimit` и `isExceeded` взаимоисключающие: превышенный лимит — уже не «почти»;
 * - лимит 0 допустим: процент не определён (`null`), `isNearLimit` всегда `false`,
 *   любой расход — превышение;
 * - процент округляется вниз, чтобы 79,9% не показывались как 80% и не включали
 *   предупреждение раньше времени.
 *
 * @param limitKopecks - лимит в копейках, неотрицательное целое
 * @param spentKopecks - потрачено в копейках, неотрицательное целое
 * @returns остаток, превышение, процент и флаги состояния
 * @throws {RangeError} если любой аргумент не является неотрицательным целым числом копеек
 */
export function calculateBudgetUsage(limitKopecks: number, spentKopecks: number): BudgetUsage {
  assertValidKopecks(limitKopecks, 'Лимит');
  assertValidKopecks(spentKopecks, 'Сумма расходов');

  const isExceeded = spentKopecks > limitKopecks;
  // BigInt: при spent > ~9·10^13 копеек произведение spent × 100 теряет точность во float,
  // и сумма на копейку ниже лимита показывалась бы как 100%. Деление BigInt — уже floor.
  const percentUsed =
    limitKopecks === 0
      ? null
      : Number((BigInt(spentKopecks) * 100n) / BigInt(limitKopecks));
  const isNearLimit =
    !isExceeded && percentUsed !== null && percentUsed >= NEAR_LIMIT_THRESHOLD_PERCENT;

  return {
    remaining: Math.max(0, limitKopecks - spentKopecks),
    overspent: Math.max(0, spentKopecks - limitKopecks),
    percentUsed,
    isExceeded,
    isNearLimit,
  };
}
