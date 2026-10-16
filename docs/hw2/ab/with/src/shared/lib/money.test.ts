import { describe, expect, it } from 'vitest';

import { fromKopecks, toKopecks } from './money';

describe('toKopecks', () => {
  it('переводит рубли в копейки', () => {
    expect(toKopecks(150)).toBe(15000);
    expect(toKopecks(99.99)).toBe(9999);
  });

  it('корректно обрабатывает значения с погрешностью float', () => {
    expect(toKopecks(1.15)).toBe(115);
    expect(toKopecks(0.1 + 0.2)).toBe(30);
  });

  it('обрабатывает ноль, отрицательные и максимальные для numeric(12,2) значения', () => {
    expect(toKopecks(0)).toBe(0);
    expect(Object.is(toKopecks(-0), 0)).toBe(true);
    expect(toKopecks(-12.5)).toBe(-1250);
    expect(toKopecks(9_999_999_999.99)).toBe(999_999_999_999);
  });

  it('бросает ошибку для больше чем 2 знаков после запятой', () => {
    expect(() => toKopecks(1.005)).toThrow(RangeError);
  });

  it('бросает ошибку для NaN и Infinity', () => {
    expect(() => toKopecks(Number.NaN)).toThrow(RangeError);
    expect(() => toKopecks(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('fromKopecks', () => {
  it('переводит копейки в рубли', () => {
    expect(fromKopecks(115)).toBe(1.15);
    expect(fromKopecks(-1250)).toBe(-12.5);
    expect(fromKopecks(0)).toBe(0);
  });

  it('бросает ошибку для дробного количества копеек', () => {
    expect(() => fromKopecks(1.5)).toThrow(RangeError);
    expect(() => fromKopecks(Number.NaN)).toThrow(RangeError);
  });
});
