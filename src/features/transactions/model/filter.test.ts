import { describe, expect, it } from 'vitest';

import { lookups, makeTx } from '@/test/fixtures';

import { countActiveFilters, filterTransactions, matchesFilters, matchesSearch } from './filter';
import { EMPTY_FILTERS, type TransactionQuery } from './types';

const period = { from: '2026-10-01', to: '2026-10-31' };
const query = (patch: Partial<TransactionQuery> = {}): TransactionQuery => ({
  period,
  search: '',
  filters: EMPTY_FILTERS,
  ...patch,
});

describe('filterTransactions', () => {
  it('оставляет операции периода, без удалённых, новые сверху', () => {
    const old = makeTx({ date: '2026-10-02' });
    const fresh = makeTx({ date: '2026-10-20' });
    const outside = makeTx({ date: '2026-11-01' });
    const deleted = makeTx({ date: '2026-10-05', deletedAt: '2026-10-06T00:00:00.000Z' });
    expect(
      filterTransactions([old, outside, fresh, deleted], query(), lookups).map((t) => t.id),
    ).toEqual([fresh.id, old.id]);
  });

  it('внутри дня сортирует по времени создания, новые сверху', () => {
    const first = makeTx({ createdAt: '2026-10-10T08:00:00.000Z' });
    const second = makeTx({ createdAt: '2026-10-10T09:00:00.000Z' });
    expect(filterTransactions([first, second], query(), lookups).map((t) => t.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it('границы периода включительно', () => {
    const edge = [makeTx({ date: '2026-10-01' }), makeTx({ date: '2026-10-31' })];
    expect(filterTransactions(edge, query(), lookups)).toHaveLength(2);
  });
});

describe('matchesFilters', () => {
  it('категория и подкатегория — один фильтр по «ИЛИ»', () => {
    const fuel = makeTx({ subcategoryId: 'sub-car-1' });
    const coffee = makeTx({ subcategoryId: 'sub-cafe-1' });
    const market = makeTx({ subcategoryId: 'sub-food-2' });
    const filters = { ...EMPTY_FILTERS, categoryIds: ['cat-car'], subcategoryIds: ['sub-cafe-1'] };
    expect([fuel, coffee, market].map((t) => matchesFilters(t, filters, lookups))).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('разные фильтры объединяются по «И»', () => {
    const tx = makeTx({ tagIds: ['tag-sochi'], authorId: 'm-maria' });
    expect(
      matchesFilters(
        tx,
        { ...EMPTY_FILTERS, tagIds: ['tag-sochi'], authorIds: ['m-maria'] },
        lookups,
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        tx,
        { ...EMPTY_FILTERS, tagIds: ['tag-sochi'], authorIds: ['m-alexey'] },
        lookups,
      ),
    ).toBe(false);
    expect(matchesFilters(tx, { ...EMPTY_FILTERS, type: 'income' }, lookups)).toBe(false);
  });
});

describe('matchesSearch', () => {
  it('ищет без учёта регистра по комментарию, категории, подкатегории и тегу', () => {
    const tx = makeTx({
      subcategoryId: 'sub-car-1',
      comment: 'АЗС на трассе',
      tagIds: ['tag-sochi'],
    });
    for (const needle of ['азс', 'АВТОМОБИЛЬ', 'топл', 'сочи', '  трассе  ']) {
      expect(matchesSearch(tx, needle, lookups), needle).toBe(true);
    }
    expect(matchesSearch(tx, 'кафе', lookups)).toBe(false);
    expect(matchesSearch(tx, '', lookups)).toBe(true);
  });
});

describe('countActiveFilters', () => {
  it('считает фильтры, а не выбранные значения', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS,
        categoryIds: ['a', 'b'],
        subcategoryIds: ['c'],
        type: 'expense',
      }),
    ).toBe(2);
  });
});
