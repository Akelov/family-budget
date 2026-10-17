import { describe, expect, it } from 'vitest';

import { makeTx } from '@/test/fixtures';

import { groupByDay } from './group';
import { signedAmount, spentShare, summarize } from './summary';

describe('summarize', () => {
  it('считает доход, расход и остаток в копейках без ошибок float', () => {
    const txs = [
      makeTx({ type: 'income', amount: 10 }),
      makeTx({ type: 'income', amount: 20 }),
      makeTx({ type: 'expense', amount: 30 }),
    ];
    // 0,10 + 0,20 − 0,30 = ровно 0, а не 5.55e-17, как во float.
    expect(summarize(txs)).toEqual({ income: 30, expense: 30, balance: 0 });
  });

  it('пустой период и отрицательный остаток', () => {
    expect(summarize([])).toEqual({ income: 0, expense: 0, balance: 0 });
    expect(summarize([makeTx({ amount: 500 })]).balance).toBe(-500);
  });
});

describe('spentShare', () => {
  it('округляет долю вниз и не делит на ноль', () => {
    expect(spentShare({ income: 300, expense: 200, balance: 100 })).toBe(66);
    expect(spentShare({ income: 0, expense: 200, balance: -200 })).toBeNull();
    expect(spentShare({ income: 100, expense: 250, balance: -150 })).toBe(250);
  });
});

describe('groupByDay', () => {
  it('группирует по дням с итогом дня со знаком', () => {
    const groups = groupByDay([
      makeTx({ date: '2026-10-14', type: 'income', amount: 9_500_000 }),
      makeTx({ date: '2026-10-14', amount: 250_000 }),
      makeTx({ date: '2026-10-13', amount: 100 }),
    ]);
    expect(groups.map((g) => [g.date, g.total, g.items.length])).toEqual([
      ['2026-10-14', 9_250_000, 2],
      ['2026-10-13', -100, 1],
    ]);
    expect(groups[0]?.title).toBe('Среда, 14 октября 2026 г.');
  });

  it('signedAmount: расход отрицательный', () => {
    expect(signedAmount({ type: 'expense', amount: 5 })).toBe(-5);
  });
});
