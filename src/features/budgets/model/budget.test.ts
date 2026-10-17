import { describe, expect, it } from 'vitest';

import { buildLookups } from '@/shared/lib/lookups';
import type { Budget } from '@/shared/types/domain';
import { lookups, makeTx, seed } from '@/test/fixtures';

import { budgetStatus, budgetSubcategoryIds, computeBudget, describeBudgetItems } from './budget';

const LIMIT = 8_000_000; // 80 000 ₽

describe('budgetStatus — приложение C ТЗ', () => {
  it.each([
    [6_399_999, 'ok', 0],
    [6_400_000, 'warning', 0],
    [8_000_000, 'warning', 0],
    [8_000_001, 'over', 1],
    [8_500_000, 'over', 500_000],
  ])('потрачено %i коп. → %s', (spent, kind, overBy) => {
    expect(budgetStatus(spent, LIMIT)).toEqual({ kind, overBy });
  });

  it('выбрасывает RangeError на нулевом лимите и дробных копейках', () => {
    expect(() => budgetStatus(1, 0)).toThrow(RangeError);
    expect(() => budgetStatus(0.5, LIMIT)).toThrow(RangeError);
  });
});

const budget: Budget = {
  id: 'b1',
  name: 'Тест',
  amount: LIMIT,
  items: [
    { kind: 'category', categoryId: 'cat-car' },
    { kind: 'subcategory', subcategoryId: 'sub-food-1' },
  ],
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const period = { from: '2026-09-29', to: '2026-10-28' };

describe('computeBudget', () => {
  it('считает только расходы периода по подкатегориям бюджета, процент и остаток', () => {
    const txs = [
      makeTx({ subcategoryId: 'sub-car-1', amount: 5_000_000, date: '2026-10-01' }),
      makeTx({ subcategoryId: 'sub-food-1', amount: 1_500_000, date: '2026-09-29' }),
      makeTx({ subcategoryId: 'sub-food-2', amount: 9_999_999, date: '2026-10-01' }),
      makeTx({ subcategoryId: 'sub-car-1', amount: 9_999_999, date: '2026-09-28' }),
      makeTx({
        subcategoryId: 'sub-car-1',
        amount: 9_999_999,
        date: '2026-10-02',
        deletedAt: '2026-10-03T00:00:00.000Z',
      }),
    ];
    const view = computeBudget(budget, txs, period, lookups);
    expect([view.spent, view.remaining, view.percent, view.status.kind]).toEqual([
      6_500_000,
      1_500_000,
      81,
      'warning',
    ]);
  });

  it('категория целиком включает подкатегории, добавленные позже, и архивные', () => {
    const extended = buildLookups({
      ...seed,
      subcategories: [
        ...seed.subcategories,
        {
          id: 'sub-car-new',
          categoryId: 'cat-car',
          name: 'Мойка',
          archivedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    });
    expect(budgetSubcategoryIds(budget, extended).has('sub-car-new')).toBe(true);
  });

  it('описывает состав бюджета', () => {
    expect(describeBudgetItems(budget, lookups)).toBe(
      'Продукты: Супермаркет · Автомобиль (вся категория)',
    );
  });
});
