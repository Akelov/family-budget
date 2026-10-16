import { fromKopecks, toKopecks } from '@/shared/lib/money';

import type { CategoryExpense, MonthSummary, Transaction } from './types';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

interface KopecksTotals {
  income: number;
  expense: number;
  byCategory: ReadonlyMap<string, number>;
}

const EMPTY_TOTALS: KopecksTotals = { income: 0, expense: 0, byCategory: new Map() };

function assertValidMonth(month: string): void {
  if (!MONTH_PATTERN.test(month)) {
    throw new RangeError(`Месяц должен быть в формате YYYY-MM, получено: "${month}"`);
  }
}

// Отрицательная или нулевая сумма означает битые данные: знак задаёт тип операции,
// а не сама сумма, поэтому молча складывать такие значения нельзя.
function toPositiveKopecks(transaction: Transaction): number {
  const kopecks = toKopecks(transaction.amount);
  if (kopecks <= 0) {
    throw new RangeError(
      `Сумма операции ${transaction.id} должна быть положительной, получено: ${transaction.amount}`,
    );
  }
  return kopecks;
}

function addTransaction(totals: KopecksTotals, transaction: Transaction): KopecksTotals {
  const kopecks = toPositiveKopecks(transaction);

  if (transaction.type === 'income') {
    return { ...totals, income: totals.income + kopecks };
  }

  const byCategory = new Map(totals.byCategory);
  byCategory.set(transaction.categoryId, (byCategory.get(transaction.categoryId) ?? 0) + kopecks);
  return { ...totals, expense: totals.expense + kopecks, byCategory };
}

function toSortedCategoryExpenses(byCategory: ReadonlyMap<string, number>): CategoryExpense[] {
  return [...byCategory.entries()]
    .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB))
    .map(([categoryId, kopecks]) => ({ categoryId, amount: fromKopecks(kopecks) }));
}

/**
 * Считает сводку по операциям семьи за месяц: доходы, расходы, баланс и расходы по категориям.
 * Вся арифметика ведётся в копейках, в рубли результат переводится только в конце.
 *
 * @param transactions - список операций (может содержать операции других месяцев — они игнорируются).
 * @param month - месяц в формате `YYYY-MM`.
 * @returns сводка за месяц; суммы в рублях. Если операций за месяц нет — все суммы равны 0,
 *   а `expensesByCategory` пуст. Баланс может быть отрицательным. Категории отсортированы
 *   по убыванию суммы, при равенстве — по `categoryId`.
 * @throws {RangeError} если `month` не в формате `YYYY-MM`, либо у операции выбранного месяца
 *   сумма не положительная или содержит больше 2 знаков после запятой.
 */
export function calculateMonthSummary(
  transactions: readonly Transaction[],
  month: string,
): MonthSummary {
  assertValidMonth(month);

  const totals = transactions
    .filter((transaction) => transaction.date.slice(0, 7) === month)
    .reduce(addTransaction, EMPTY_TOTALS);

  return {
    month,
    totalIncome: fromKopecks(totals.income),
    totalExpense: fromKopecks(totals.expense),
    balance: fromKopecks(totals.income - totals.expense),
    expensesByCategory: toSortedCategoryExpenses(totals.byCategory),
  };
}
