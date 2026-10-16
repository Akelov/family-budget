import { fromKopecks, toKopecks } from '@/shared/lib/money';
import { isValidMonth } from '@/shared/lib/month';
import type { Transaction } from '@/shared/lib/types';

import { calculateBudgetUsage } from './budgetUsage';
import { normalizeCategory } from './category';
import { forecastMonthSpending } from './forecast';
import { sumExpensesByCategory } from './spending';
import type { Budget, BudgetStatus } from './types';

/** Дубликат лимита — ошибка данных: непонятно, какой из лимитов действует */
function assertNoDuplicateCategories(budgets: readonly Budget[]): void {
  const seen = new Set<string>();
  budgets.forEach((budget) => {
    const key = normalizeCategory(budget.category);
    if (seen.has(key)) {
      throw new RangeError(`Лимит на категорию «${budget.category}» за ${budget.month} задан дважды`);
    }
    seen.add(key);
  });
}

function toBudgetStatus(
  budget: Budget,
  spending: ReadonlyMap<string, number>,
  today: string,
): BudgetStatus {
  const limitKopecks = toKopecks(budget.limit);
  const spentKopecks = spending.get(normalizeCategory(budget.category)) ?? 0;
  const usage = calculateBudgetUsage(limitKopecks, spentKopecks);
  const forecastKopecks = forecastMonthSpending(spentKopecks, budget.month, today);

  return {
    category: budget.category,
    month: budget.month,
    limit: budget.limit,
    spent: fromKopecks(spentKopecks),
    remaining: fromKopecks(usage.remaining),
    overspent: fromKopecks(usage.overspent),
    percentUsed: usage.percentUsed,
    isExceeded: usage.isExceeded,
    isNearLimit: usage.isNearLimit,
    forecast: forecastKopecks === null ? null : fromKopecks(forecastKopecks),
    isForecastExceeded: forecastKopecks !== null && forecastKopecks > limitKopecks,
  };
}

/** Сначала самые «горящие» категории; `null` (лимит 0) — в конце; при равенстве — по алфавиту */
function compareByPercentUsed(a: BudgetStatus, b: BudgetStatus): number {
  if (a.percentUsed === b.percentUsed) {
    return a.category.localeCompare(b.category, 'ru-RU');
  }
  if (a.percentUsed === null) {
    return 1;
  }
  if (b.percentUsed === null) {
    return -1;
  }
  return b.percentUsed - a.percentUsed;
}

/**
 * Собирает сводку по всем месячным лимитам: сколько потрачено, остаток, процент,
 * флаги «почти у лимита» / «превышен» и прогноз до конца месяца.
 *
 * - Учитываются только лимиты месяца `month`; лимиты других месяцев игнорируются
 *   (и на дубликаты не проверяются).
 * - Категории с расходами, но без лимита, в сводку не попадают.
 * - Суммы в результате — в рублях (готовы для `formatMoney`), расчёты — в копейках.
 * - Порядок: `percentUsed` по убыванию, `null` в конце, при равенстве — по названию.
 *
 * @param budgets - лимиты семьи (любых месяцев)
 * @param transactions - операции семьи (любых типов и месяцев)
 * @param month - расчётный месяц `YYYY-MM`
 * @param today - текущая дата `YYYY-MM-DD` для прогноза (передаётся явно — функция чистая)
 * @returns статусы лимитов месяца; пустой массив, если лимитов на месяц нет
 * @throws {RangeError} при некорректных месяце или дате, дубликате лимита на категорию
 *   в месяце (сравнение через `trim()` без учёта регистра), некорректном лимите
 *   или некорректной учитываемой операции
 */
export function buildBudgetOverview(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  month: string,
  today: string,
): BudgetStatus[] {
  if (!isValidMonth(month)) {
    throw new RangeError(`Некорректный месяц: ${month}`);
  }
  const monthBudgets = budgets.filter((budget) => budget.month === month);
  assertNoDuplicateCategories(monthBudgets);

  const spending = sumExpensesByCategory(transactions, month);
  return monthBudgets
    .map((budget) => toBudgetStatus(budget, spending, today))
    .sort(compareByPercentUsed);
}
