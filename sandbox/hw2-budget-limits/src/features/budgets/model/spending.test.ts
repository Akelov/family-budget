import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Transaction } from '@/shared/lib/types';

import { sumExpensesByCategory } from './spending';

let nextId = 0;

/** Мок-операция: по умолчанию расход 100 ₽ на «Продукты» 16 октября 2026 */
function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  nextId += 1;
  return {
    id: `tx-${nextId}`,
    type: 'expense',
    amount: 100,
    category: 'Продукты',
    author: 'Участник 1',
    date: '2026-10-16',
    ...overrides,
  };
}

describe('sumExpensesByCategory', () => {
  test('суммирует расходы месяца по категориям в копейках', () => {
    const transactions = [
      makeTransaction({ amount: 1500.5 }),
      makeTransaction({ amount: 499.5 }),
      makeTransaction({ category: 'Транспорт', amount: 300 }),
    ];
    assert.deepEqual(
      sumExpensesByCategory(transactions, '2026-10'),
      new Map([
        ['продукты', 200_000],
        ['транспорт', 30_000],
      ]),
    );
  });

  test('не учитывает доходы и операции других месяцев, включая граничные даты', () => {
    const transactions = [
      makeTransaction({ type: 'income', amount: 50_000 }),
      makeTransaction({ date: '2026-09-30', amount: 1000 }),
      makeTransaction({ date: '2026-11-01', amount: 1000 }),
      makeTransaction({ date: '2025-10-16', amount: 1000 }),
      makeTransaction({ date: '2026-10-01', amount: 10 }),
      makeTransaction({ date: '2026-10-31', amount: 20 }),
    ];
    assert.deepEqual(sumExpensesByCategory(transactions, '2026-10'), new Map([['продукты', 3000]]));
  });

  test('объединяет разные написания категории и не теряет копейки', () => {
    const transactions = [
      makeTransaction({ category: 'Продукты', amount: 0.1 }),
      makeTransaction({ category: ' продукты ', amount: 0.2 }),
    ];
    assert.deepEqual(sumExpensesByCategory(transactions, '2026-10'), new Map([['продукты', 30]]));
  });

  test('краевые случаи: пустой список и месяц без расходов', () => {
    assert.deepEqual(sumExpensesByCategory([], '2026-10'), new Map());
    assert.deepEqual(sumExpensesByCategory([makeTransaction()], '2026-11'), new Map());
  });

  test('бросает ошибку на некорректный месяц', () => {
    assert.throws(() => sumExpensesByCategory([], '2026-13'), RangeError);
    assert.throws(() => sumExpensesByCategory([], '10.2026'), RangeError);
  });

  test('бросает ошибку на некорректную учитываемую операцию', () => {
    const check = (overrides: Partial<Transaction>) => () =>
      sumExpensesByCategory([makeTransaction(overrides)], '2026-10');
    assert.throws(check({ date: '2026-02-30' }), RangeError);
    assert.throws(check({ amount: -100 }), RangeError);
    assert.throws(check({ amount: 10.005 }), RangeError);
    assert.throws(check({ category: '  ' }), RangeError);
  });
});
