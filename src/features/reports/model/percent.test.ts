import { describe, expect, it } from 'vitest';

import { largestRemainderPercents } from './percent';

describe('largestRemainderPercents (FR-4.5)', () => {
  it('сумма долей всегда ровно 100', () => {
    expect(largestRemainderPercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(
      largestRemainderPercents([2_977_320, 1_695_000, 1_197_000, 815_000, 787_048, 750_000]),
    ).toSatisfy((p: number[]) => p.reduce((a, b) => a + b, 0) === 100);
  });

  it('краевые случаи: одна доля, нули, огромные суммы', () => {
    expect(largestRemainderPercents([500])).toEqual([100]);
    expect(largestRemainderPercents([0, 0])).toEqual([0, 0]);
    expect(largestRemainderPercents([])).toEqual([]);
    expect(largestRemainderPercents([Number.MAX_SAFE_INTEGER, 1])).toEqual([100, 0]);
  });

  it('выбрасывает RangeError на отрицательных и дробных значениях', () => {
    expect(() => largestRemainderPercents([-1, 5])).toThrow(RangeError);
    expect(() => largestRemainderPercents([1.5])).toThrow(RangeError);
  });
});
