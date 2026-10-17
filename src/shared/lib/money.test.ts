import { describe, expect, it } from 'vitest';

import {
  formatMoney,
  kopecksToInput,
  kopecksToRublesString,
  parseAmount,
  rublesStringToKopecks,
} from './money';

const NBSP = ' ';

describe('parseAmount', () => {
  it('разбирает рубли и копейки с запятой, точкой и пробелами', () => {
    expect(parseAmount('2500')).toBe(250_000);
    expect(parseAmount('2 500,5')).toBe(250_050);
    expect(parseAmount('0.29')).toBe(29);
    expect(parseAmount('9999999999,99')).toBe(999_999_999_999);
  });

  it('возвращает null для нуля, лишних знаков, отрицательных и мусора', () => {
    for (const bad of ['', '0', '0,00', '1,005', '-5', 'abc', '1,2,3', '10000000000']) {
      expect(parseAmount(bad), bad).toBeNull();
    }
  });
});

describe('formatMoney', () => {
  it('показывает копейки только при наличии и ставит знак по режиму', () => {
    expect(formatMoney(250_000)).toBe(`2${NBSP}500${NBSP}₽`);
    expect(formatMoney(1)).toBe(`0,01${NBSP}₽`);
    expect(formatMoney(-250_000, { sign: 'always' })).toBe(`−2${NBSP}500${NBSP}₽`);
    expect(formatMoney(9_500_000, { sign: 'always' })).toBe(`+95${NBSP}000${NBSP}₽`);
    expect(formatMoney(-100, { sign: 'none' })).toBe(`1${NBSP}₽`);
  });

  it('выбрасывает RangeError для дробных копеек', () => {
    expect(() => formatMoney(0.5)).toThrow(RangeError);
  });
});

describe('kopecksToInput', () => {
  it('переводит копейки в строку для поля ввода', () => {
    expect(kopecksToInput(250_000)).toBe('2500');
    expect(kopecksToInput(250_050)).toBe('2500,5');
    expect(kopecksToInput(105)).toBe('1,05');
  });

  it('выбрасывает RangeError для отрицательных', () => {
    expect(() => kopecksToInput(-1)).toThrow(RangeError);
  });
});

describe('обмен суммами с базой (numeric(12,2) ↔ копейки)', () => {
  it('строка из базы → копейки без float', () => {
    expect(rublesStringToKopecks('2500.50')).toBe(250_050);
    expect(rublesStringToKopecks('80000')).toBe(8_000_000);
    expect(rublesStringToKopecks('0.1')).toBe(10);
    expect(rublesStringToKopecks('9999999999.99')).toBe(999_999_999_999);
  });

  it('копейки → строка для записи', () => {
    expect(kopecksToRublesString(250_050)).toBe('2500.50');
    expect(kopecksToRublesString(5)).toBe('0.05');
  });

  it('выбрасывает RangeError на мусоре', () => {
    expect(() => rublesStringToKopecks('12,5')).toThrow(RangeError);
    expect(() => kopecksToRublesString(-1)).toThrow(RangeError);
  });
});
