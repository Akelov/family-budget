import { describe, expect, it } from 'vitest';

import { lookups, makeTx } from '@/test/fixtures';

import { reportByCategory, reportBySubcategory, reportByTag } from './aggregate';

const txs = [
  makeTx({ subcategoryId: 'sub-car-1', amount: 3_000_00 }),
  makeTx({ subcategoryId: 'sub-car-2', amount: 1_000_00 }),
  makeTx({ subcategoryId: 'sub-food-1', amount: 1_000_00, tagIds: ['tag-sochi', 'tag-kitchen'] }),
  makeTx({
    subcategoryId: 'sub-salary-2',
    type: 'income',
    amount: 9_000_00,
    tagIds: ['tag-sochi'],
  }),
];

describe('reportByCategory', () => {
  it('суммирует по категориям выбранного типа по убыванию с долями', () => {
    const { rows, total } = reportByCategory(txs, 'expense', lookups);
    expect(total).toBe(5_000_00);
    expect(rows.map((r) => [r.name, r.amount, r.percent])).toEqual([
      ['Автомобиль', 4_000_00, 80],
      ['Продукты', 1_000_00, 20],
    ]);
  });

  it('пустой отчёт без операций выбранного типа', () => {
    expect(reportByCategory([], 'income', lookups)).toEqual({ rows: [], total: 0 });
  });
});

describe('reportBySubcategory', () => {
  it('доли внутри категории, у подкатегорий разные цвета', () => {
    const { rows } = reportBySubcategory(txs, 'cat-car', lookups);
    expect(rows.map((r) => [r.name, r.percent])).toEqual([
      ['Топливо', 75],
      ['Обслуживание', 25],
    ]);
    expect(rows[0]?.color).not.toBe(rows[1]?.color);
  });

  it('неизвестная категория — пустой отчёт', () => {
    expect(reportBySubcategory(txs, 'nope', lookups).rows).toEqual([]);
  });
});

describe('reportByTag', () => {
  it('операция с несколькими тегами учитывается в каждом', () => {
    const { rows, total } = reportByTag(txs, 'expense', lookups);
    expect(rows.map((r) => [r.name, r.amount])).toEqual([
      ['Отпуск в Сочи', 1_000_00],
      ['Ремонт кухни', 1_000_00],
    ]);
    expect(total).toBe(2_000_00);
  });
});
