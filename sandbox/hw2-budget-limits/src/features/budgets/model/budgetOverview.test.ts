import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Transaction } from '@/shared/lib/types';

import { buildBudgetOverview } from './index';
import type { Budget, BudgetStatus } from './index';

const MONTH = '2026-10';
const TODAY = '2026-10-16';

let nextId = 0;

/** Мок-операция: по умолчанию расход 16 октября 2026 */
function expense(category: string, amount: number, date = TODAY): Transaction {
  nextId += 1;
  return { id: `tx-${nextId}`, type: 'expense', amount, category, author: 'Участник 1', date };
}

function income(category: string, amount: number, date = TODAY): Transaction {
  return { ...expense(category, amount, date), type: 'income' };
}

function budget(category: string, limit: number, month = MONTH): Budget {
  return { category, limit, month };
}

const OVERVIEW_BUDGETS: Budget[] = [
  budget('Продукты', 30_000),
  budget('Кафе', 5000),
  budget('Транспорт', 3000),
  // лимиты другого месяца, в том числе дубликат, — игнорируются
  budget('Продукты', 25_000, '2026-09'),
  budget('Подарки', 1000, '2026-09'),
  budget('подарки', 2000, '2026-09'),
];

const OVERVIEW_TRANSACTIONS: Transaction[] = [
  expense('Продукты', 11_000, '2026-10-03'),
  expense(' продукты', 4000, '2026-10-15'),
  expense('Кафе', 2500, '2026-10-10'),
  expense('кафе', 1700, '2026-10-14'),
  expense('Транспорт', 3500.5, '2026-10-05'),
  expense('Аптека', 800, '2026-10-07'), // категория без лимита
  expense('Продукты', 9999, '2026-09-30'), // соседний месяц
  expense('Кафе', 7777, '2026-11-01'), // соседний месяц
  income('Зарплата', 90_000, '2026-10-05'),
  income('Продукты', 1000, '2026-10-12'), // кэшбэк не уменьшает траты
];

describe('buildBudgetOverview', () => {
  test('сквозной сценарий: 3 категории, доходы и операции соседних месяцев', () => {
    const expected: BudgetStatus[] = [
      {
        category: 'Транспорт',
        month: MONTH,
        limit: 3000,
        spent: 3500.5,
        remaining: 0,
        overspent: 500.5,
        percentUsed: 116,
        isExceeded: true,
        isNearLimit: false,
        forecast: 6782.22, // 350 050 коп. × 31 / 16 = 678 221,875 → 678 222 коп.
        isForecastExceeded: true,
      },
      {
        category: 'Кафе',
        month: MONTH,
        limit: 5000,
        spent: 4200,
        remaining: 800,
        overspent: 0,
        percentUsed: 84,
        isExceeded: false,
        isNearLimit: true,
        forecast: 8137.5,
        isForecastExceeded: true,
      },
      {
        category: 'Продукты',
        month: MONTH,
        limit: 30_000,
        spent: 15_000,
        remaining: 15_000,
        overspent: 0,
        percentUsed: 50,
        isExceeded: false,
        isNearLimit: false,
        forecast: 29_062.5,
        isForecastExceeded: false,
      },
    ];
    assert.deepEqual(
      buildBudgetOverview(OVERVIEW_BUDGETS, OVERVIEW_TRANSACTIONS, MONTH, TODAY),
      expected,
    );
  });

  test('сортировка: процент по убыванию, лимит 0 (null) в конце, при равенстве — по алфавиту', () => {
    const budgets = [budget('Подписки', 0), budget('Бытовая химия', 100), budget('Аптека', 100)];
    const transactions = [
      expense('Подписки', 100),
      expense('Бытовая химия', 50),
      expense('Аптека', 50),
    ];
    const result = buildBudgetOverview(budgets, transactions, MONTH, TODAY);
    assert.deepEqual(
      result.map(({ category, percentUsed }) => [category, percentUsed]),
      [
        ['Аптека', 50],
        ['Бытовая химия', 50],
        ['Подписки', null],
      ],
    );
    assert.equal(result[2]?.isExceeded, true);
  });

  test('категория без трат: 0%, полный остаток, прогноз 0', () => {
    const [status] = buildBudgetOverview([budget('Продукты', 30_000)], [], MONTH, TODAY);
    assert.equal(status?.spent, 0);
    assert.equal(status?.remaining, 30_000);
    assert.equal(status?.percentUsed, 0);
    assert.equal(status?.forecast, 0);
    assert.equal(status?.isForecastExceeded, false);
  });

  test('прошедший месяц: прогноз равен факту; будущий — прогноза нет', () => {
    const transactions = [expense('Продукты', 26_000, '2026-09-20')];
    const [past] = buildBudgetOverview(
      [budget('Продукты', 25_000, '2026-09')],
      transactions,
      '2026-09',
      TODAY,
    );
    assert.equal(past?.forecast, 26_000);
    assert.equal(past?.isForecastExceeded, true);

    const [future] = buildBudgetOverview([budget('Продукты', 25_000, '2026-11')], [], '2026-11', TODAY);
    assert.equal(future?.forecast, null);
    assert.equal(future?.isForecastExceeded, false);
  });

  test('краевой случай: нет лимитов на месяц — пустой массив', () => {
    assert.deepEqual(buildBudgetOverview([], OVERVIEW_TRANSACTIONS, MONTH, TODAY), []);
    assert.deepEqual(
      buildBudgetOverview([budget('Продукты', 100, '2026-09')], [], MONTH, TODAY),
      [],
    );
  });

  test('не мутирует входные массивы', () => {
    const budgets = [budget('А', 100), budget('Б', 100)];
    const snapshot = structuredClone(budgets);
    buildBudgetOverview(budgets, [expense('Б', 90)], MONTH, TODAY);
    assert.deepEqual(budgets, snapshot);
  });

  test('бросает ошибку на дубликат лимита в месяце (с учётом регистра и пробелов)', () => {
    const budgets = [budget('Продукты', 30_000), budget(' продукты ', 20_000)];
    assert.throws(() => buildBudgetOverview(budgets, [], MONTH, TODAY), /задан дважды/);
  });

  test('бросает ошибку на некорректные месяц, дату и лимит', () => {
    const valid = [budget('Продукты', 100)];
    assert.throws(() => buildBudgetOverview(valid, [], '2026-13', TODAY), RangeError);
    assert.throws(() => buildBudgetOverview(valid, [], MONTH, '2026-10-32'), RangeError);
    assert.throws(() => buildBudgetOverview([budget('Продукты', -1)], [], MONTH, TODAY), RangeError);
    assert.throws(() => buildBudgetOverview([budget('Продукты', 10.005)], [], MONTH, TODAY), RangeError);
    assert.throws(() => buildBudgetOverview([budget('  ', 100)], [], MONTH, TODAY), RangeError);
  });
});
