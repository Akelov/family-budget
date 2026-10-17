import type { Transaction } from '@/shared/types/domain';

import type { Summary } from './types';

/**
 * Сводка периода (FR-3.10): доход, расход и остаток в копейках.
 *
 * @param transactions - уже отфильтрованные операции периода
 * @returns остаток может быть отрицательным
 */
export function summarize(transactions: readonly Transaction[]): Summary {
  const { income, expense } = transactions.reduce(
    (acc, tx) =>
      tx.type === 'income'
        ? { ...acc, income: acc.income + tx.amount }
        : { ...acc, expense: acc.expense + tx.amount },
    { income: 0, expense: 0 },
  );
  return { income, expense, balance: income - expense };
}

/**
 * Доля расходов от дохода в целых процентах (полоса «Потрачено N% от дохода»).
 * Без дохода доля не определена — возвращается `null`.
 */
export function spentShare(summary: Summary): number | null {
  if (summary.income === 0) return null;
  return Math.floor((summary.expense * 100) / summary.income);
}

/** Знаковая сумма операции: расход отрицательный, доход положительный. */
export function signedAmount(tx: Pick<Transaction, 'type' | 'amount'>): number {
  return tx.type === 'income' ? tx.amount : -tx.amount;
}
