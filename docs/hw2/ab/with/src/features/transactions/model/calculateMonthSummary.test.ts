import { describe, expect, it } from 'vitest';

import { calculateMonthSummary } from './calculateMonthSummary';
import type { Transaction } from './types';

// Мок-данные: id и категории условные, суммы вымышленные.
function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 100,
    categoryId: 'cat-food',
    date: '2026-03-15',
    ...overrides,
  };
}

const MARCH_TRANSACTIONS: Transaction[] = [
  makeTransaction({ id: 'tx-1', type: 'income', amount: 50000, categoryId: 'cat-salary' }),
  makeTransaction({ id: 'tx-2', type: 'income', amount: 1500.5, categoryId: 'cat-other' }),
  makeTransaction({ id: 'tx-3', amount: 1200.3, categoryId: 'cat-food', date: '2026-03-01' }),
  makeTransaction({ id: 'tx-4', amount: 800.2, categoryId: 'cat-food', date: '2026-03-31' }),
  makeTransaction({ id: 'tx-5', amount: 15000, categoryId: 'cat-rent' }),
  makeTransaction({ id: 'tx-6', amount: 450, categoryId: 'cat-transport' }),
];

describe('calculateMonthSummary', () => {
  it('считает доходы, расходы, баланс и расходы по категориям', () => {
    const summary = calculateMonthSummary(MARCH_TRANSACTIONS, '2026-03');

    expect(summary).toEqual({
      month: '2026-03',
      totalIncome: 51500.5,
      totalExpense: 17450.5,
      balance: 34050,
      expensesByCategory: [
        { categoryId: 'cat-rent', amount: 15000 },
        { categoryId: 'cat-food', amount: 2000.5 },
        { categoryId: 'cat-transport', amount: 450 },
      ],
    });
  });

  it('игнорирует операции других месяцев, включая соседние даты', () => {
    const transactions = [
      ...MARCH_TRANSACTIONS,
      makeTransaction({ id: 'tx-feb', amount: 999, date: '2026-02-28' }),
      makeTransaction({ id: 'tx-apr', type: 'income', amount: 999, date: '2026-04-01' }),
      makeTransaction({ id: 'tx-prev-year', amount: 999, date: '2025-03-15' }),
    ];

    const summary = calculateMonthSummary(transactions, '2026-03');

    expect(summary.totalIncome).toBe(51500.5);
    expect(summary.totalExpense).toBe(17450.5);
  });

  it('не накапливает ошибку float при сложении копеек', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', amount: 0.1 }),
      makeTransaction({ id: 'tx-2', amount: 0.2 }),
    ];

    const summary = calculateMonthSummary(transactions, '2026-03');

    expect(summary.totalExpense).toBe(0.3);
    expect(summary.balance).toBe(-0.3);
    expect(summary.expensesByCategory).toEqual([{ categoryId: 'cat-food', amount: 0.3 }]);
  });

  it('возвращает нули и пустой список, если операций за месяц нет', () => {
    expect(calculateMonthSummary([], '2026-03')).toEqual({
      month: '2026-03',
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      expensesByCategory: [],
    });
  });

  it('возвращает отрицательный баланс, если расходы больше доходов', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', type: 'income', amount: 1000, categoryId: 'cat-salary' }),
      makeTransaction({ id: 'tx-2', amount: 1500.75 }),
    ];

    expect(calculateMonthSummary(transactions, '2026-03').balance).toBe(-500.75);
  });

  it('не включает доходы в расходы по категориям', () => {
    const transactions = [makeTransaction({ type: 'income', amount: 1000, categoryId: 'cat-salary' })];

    expect(calculateMonthSummary(transactions, '2026-03').expensesByCategory).toEqual([]);
  });

  it('при равных суммах сортирует категории по categoryId', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', amount: 300, categoryId: 'cat-b' }),
      makeTransaction({ id: 'tx-2', amount: 300, categoryId: 'cat-a' }),
    ];

    const categoryIds = calculateMonthSummary(transactions, '2026-03').expensesByCategory.map(
      (expense) => expense.categoryId,
    );

    expect(categoryIds).toEqual(['cat-a', 'cat-b']);
  });

  it('не мутирует входной массив', () => {
    const transactions = Object.freeze([...MARCH_TRANSACTIONS]);

    expect(() => calculateMonthSummary(transactions, '2026-03')).not.toThrow();
    expect(transactions).toEqual(MARCH_TRANSACTIONS);
  });

  it.each(['2026-3', '2026-13', '2026-00', '03-2026', '2026-03-01', ''])(
    'бросает ошибку для некорректного месяца "%s"',
    (month) => {
      expect(() => calculateMonthSummary(MARCH_TRANSACTIONS, month)).toThrow(RangeError);
    },
  );

  it.each([0, -100, 10.555, Number.NaN])(
    'бросает ошибку для некорректной суммы операции %s',
    (amount) => {
      const transactions = [makeTransaction({ amount })];

      expect(() => calculateMonthSummary(transactions, '2026-03')).toThrow(RangeError);
    },
  );

  it('не проверяет суммы операций других месяцев', () => {
    const transactions = [makeTransaction({ amount: -1, date: '2026-02-10' })];

    expect(calculateMonthSummary(transactions, '2026-03').totalExpense).toBe(0);
  });
});
