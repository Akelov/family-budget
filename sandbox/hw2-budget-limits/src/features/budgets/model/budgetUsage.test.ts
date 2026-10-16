import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { toKopecks } from '@/shared/lib/money';

import { calculateBudgetUsage } from './budgetUsage';

/** Обёртка, чтобы кейсы читались в рублях, как в таблице плана */
function usage(limitRubles: number, spentRubles: number) {
  return calculateBudgetUsage(toKopecks(limitRubles), toKopecks(spentRubles));
}

describe('calculateBudgetUsage', () => {
  test('лимит 30 000, потрачено 12 000 → 40%, остаток 18 000', () => {
    assert.deepEqual(usage(30_000, 12_000), {
      remaining: toKopecks(18_000),
      overspent: 0,
      percentUsed: 40,
      isExceeded: false,
      isNearLimit: false,
    });
  });

  test('ровно 100% — ещё не превышение, но «почти у лимита»', () => {
    assert.deepEqual(usage(30_000, 30_000), {
      remaining: 0,
      overspent: 0,
      percentUsed: 100,
      isExceeded: false,
      isNearLimit: true,
    });
  });

  test('превышение: 35 000 из 30 000 → overspent 5 000, остаток 0', () => {
    assert.deepEqual(usage(30_000, 35_000), {
      remaining: 0,
      overspent: toKopecks(5000),
      percentUsed: 116,
      isExceeded: true,
      isNearLimit: false,
    });
  });

  test('превышение на одну копейку', () => {
    const result = usage(100, 100.01);
    assert.equal(result.isExceeded, true);
    assert.equal(result.overspent, 1);
    assert.equal(result.percentUsed, 100);
  });

  test('порог 80%: 79,99% — нет, ровно 80% — да', () => {
    assert.equal(usage(100, 79.99).percentUsed, 79);
    assert.equal(usage(100, 79.99).isNearLimit, false);
    assert.equal(usage(100, 80).percentUsed, 80);
    assert.equal(usage(100, 80).isNearLimit, true);
  });

  test('процент округляется вниз: 1 из 3 → 33', () => {
    assert.equal(usage(3, 1).percentUsed, 33);
    assert.equal(usage(3, 2).percentUsed, 66);
  });

  test('краевые случаи: нулевой лимит и нулевые траты', () => {
    assert.deepEqual(usage(0, 0), {
      remaining: 0,
      overspent: 0,
      percentUsed: null,
      isExceeded: false,
      isNearLimit: false,
    });
    assert.deepEqual(usage(0, 100), {
      remaining: 0,
      overspent: toKopecks(100),
      percentUsed: null,
      isExceeded: true,
      isNearLimit: false,
    });
    assert.equal(usage(30_000, 0).percentUsed, 0);
  });

  test('процент точен и на суммах, где spent × 100 выходит за 2^53', () => {
    // регрессия: во float этот случай давал 100% при тратах на копейку ниже лимита
    const result = calculateBudgetUsage(9_007_199_253_949_091, 9_007_199_253_949_090);
    assert.equal(result.isExceeded, false);
    assert.equal(result.percentUsed, 99);
  });

  test('бросает ошибку на некорректные суммы', () => {
    assert.throws(() => calculateBudgetUsage(-1, 0), RangeError);
    assert.throws(() => calculateBudgetUsage(100, -1), RangeError);
    assert.throws(() => calculateBudgetUsage(100.5, 0), RangeError);
    assert.throws(() => calculateBudgetUsage(100, Number.NaN), RangeError);
  });
});
