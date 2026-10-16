import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthSummary } from './monthSummary.ts';
import type { Transaction } from './monthSummary.ts';

const tx = (
  id: string,
  type: Transaction['type'],
  amount: number,
  date: string,
  category = 'Прочее',
): Transaction => ({ id, type, amount, date, category });

test('считает доходы, расходы, баланс и категории за месяц', () => {
  const transactions = [
    tx('1', 'income', 15_000_000, '2026-10-05', 'Зарплата'),
    tx('2', 'income', 2_000_000, '2026-10-20', 'Подработка'),
    tx('3', 'expense', 450_050, '2026-10-01', 'Продукты'),
    tx('4', 'expense', 120_000, '2026-10-15', 'Продукты'),
    tx('5', 'expense', 3_000_000, '2026-10-31', 'Аренда'),
  ];

  assert.deepEqual(calculateMonthSummary(transactions, '2026-10'), {
    month: '2026-10',
    totalIncome: 17_000_000,
    totalExpenses: 3_570_050,
    balance: 13_429_950,
    expensesByCategory: { Продукты: 570_050, Аренда: 3_000_000 },
  });
});

test('игнорирует операции других месяцев, включая граничные даты', () => {
  const transactions = [
    tx('1', 'expense', 100, '2026-09-30'),
    tx('2', 'expense', 200, '2026-10-01'),
    tx('3', 'expense', 300, '2026-10-31'),
    tx('4', 'expense', 400, '2026-11-01'),
    tx('5', 'income', 500, '2025-10-15'), // тот же месяц, другой год
  ];

  const summary = calculateMonthSummary(transactions, '2026-10');
  assert.equal(summary.totalExpenses, 500);
  assert.equal(summary.totalIncome, 0);
});

test('пустой список и месяц без операций дают нули', () => {
  const expected = {
    month: '2026-10',
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    expensesByCategory: {},
  };
  assert.deepEqual(calculateMonthSummary([], '2026-10'), expected);
  assert.deepEqual(
    calculateMonthSummary([tx('1', 'income', 100, '2026-01-01')], '2026-10'),
    expected,
  );
});

test('баланс может быть отрицательным', () => {
  const summary = calculateMonthSummary(
    [tx('1', 'income', 1000, '2026-10-01'), tx('2', 'expense', 2500, '2026-10-02')],
    '2026-10',
  );
  assert.equal(summary.balance, -1500);
});

test('доходы не попадают в расходы по категориям', () => {
  const summary = calculateMonthSummary(
    [tx('1', 'income', 1000, '2026-10-01', 'Зарплата')],
    '2026-10',
  );
  assert.deepEqual(summary.expensesByCategory, {});
});

test('пустая категория расхода сводится к "Без категории"', () => {
  const summary = calculateMonthSummary(
    [tx('1', 'expense', 100, '2026-10-01', ''), tx('2', 'expense', 50, '2026-10-02', '  ')],
    '2026-10',
  );
  assert.deepEqual(summary.expensesByCategory, { 'Без категории': 150 });
});

test('суммы в копейках складываются без ошибок округления', () => {
  // 0.1 + 0.2 руб. во float дало бы 0.30000000000000004
  const summary = calculateMonthSummary(
    [tx('1', 'expense', 10, '2026-10-01'), tx('2', 'expense', 20, '2026-10-02')],
    '2026-10',
  );
  assert.equal(summary.totalExpenses, 30);
});

test('отклоняет некорректный месяц', () => {
  for (const month of ['2026-13', '2026-1', '10-2026', '', '2026-00']) {
    assert.throws(() => calculateMonthSummary([], month), /Некорректный месяц/);
  }
});

test('отклоняет некорректные операции', () => {
  const bad: Transaction[] = [
    tx('1', 'expense', -100, '2026-10-01'),
    tx('2', 'expense', 0, '2026-10-01'),
    tx('3', 'expense', 10.5, '2026-10-01'),
    tx('4', 'expense', 100, '2026-10-1'),
    tx('5', 'expense', 100, 'не дата'),
    { ...tx('6', 'expense', 100, '2026-10-01'), type: 'refund' as Transaction['type'] },
  ];
  for (const t of bad) {
    assert.throws(() => calculateMonthSummary([t], '2026-10'), new RegExp(`Операция ${t.id}`));
  }
});
