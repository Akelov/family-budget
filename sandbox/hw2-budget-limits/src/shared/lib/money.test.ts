import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { assertValidKopecks, fromKopecks, toKopecks } from './money';

describe('toKopecks', () => {
  test('переводит целые рубли и рубли с копейками', () => {
    assert.equal(toKopecks(30000), 3_000_000);
    assert.equal(toKopecks(1250.5), 125_050);
    assert.equal(toKopecks(99.99), 9999);
  });

  test('сумма в копейках не страдает от ошибок float', () => {
    assert.equal(toKopecks(0.1) + toKopecks(0.2), 30);
    // 0.29 * 100 === 28.999999999999996 — без округления получили бы 28
    assert.equal(toKopecks(0.29), 29);
    assert.equal(toKopecks(1.15), 115);
  });

  test('краевые случаи: ноль и максимум numeric(12,2)', () => {
    assert.equal(toKopecks(0), 0);
    assert.equal(toKopecks(9_999_999_999.99), 999_999_999_999);
  });

  test('отклоняет некорректные значения', () => {
    assert.throws(() => toKopecks(Number.NaN), RangeError);
    assert.throws(() => toKopecks(Number.POSITIVE_INFINITY), RangeError);
    assert.throws(() => toKopecks(-1), RangeError);
    assert.throws(() => toKopecks(Number.MAX_VALUE), RangeError);
  });

  test('отклоняет суммы с лишними знаками после запятой', () => {
    assert.throws(() => toKopecks(1.005), RangeError);
    assert.throws(() => toKopecks(0.001), RangeError);
    // результат float-сложения 0.30000000000000004 — признак ошибки выше по цепочке
    assert.throws(() => toKopecks(0.1 + 0.2), RangeError);
  });
});

describe('assertValidKopecks', () => {
  test('пропускает корректные суммы в копейках', () => {
    assert.doesNotThrow(() => assertValidKopecks(3_000_000));
  });

  test('краевой случай: ноль допустим', () => {
    assert.doesNotThrow(() => assertValidKopecks(0));
  });

  test('отклоняет отрицательные, дробные и нечисловые значения с понятным текстом', () => {
    assert.throws(() => assertValidKopecks(-1), RangeError);
    assert.throws(() => assertValidKopecks(0.5), RangeError);
    assert.throws(() => assertValidKopecks(Number.NaN), RangeError);
    assert.throws(() => assertValidKopecks(-1, 'Лимит'), /Лимит: ожидается неотрицательное целое/);
  });
});

describe('fromKopecks', () => {
  test('переводит копейки в рубли', () => {
    assert.equal(fromKopecks(3_000_000), 30000);
    assert.equal(fromKopecks(30), 0.3);
    assert.equal(fromKopecks(29), 0.29);
  });

  test('краевые случаи: ноль, отрицательная сумма, обратимость', () => {
    assert.equal(fromKopecks(0), 0);
    assert.equal(fromKopecks(-500), -5);
    assert.equal(fromKopecks(toKopecks(1234.56)), 1234.56);
  });

  test('отклоняет нецелые и небезопасные значения', () => {
    assert.throws(() => fromKopecks(10.5), RangeError);
    assert.throws(() => fromKopecks(Number.NaN), RangeError);
    assert.throws(() => fromKopecks(Number.MAX_SAFE_INTEGER + 1), RangeError);
  });
});
