import { describe, expect, it } from 'vitest';

import {
  formatPeriodLabel,
  periodContaining,
  periodFromParams,
  shiftPeriod,
  validateRange,
} from './period';

describe('periodContaining — режим cycle (приложение C ТЗ)', () => {
  it.each([
    [29, '2026-10-16', '2026-09-29', '2026-10-28'],
    [29, '2026-10-29', '2026-10-29', '2026-11-28'],
    [29, '2026-02-27', '2026-01-29', '2026-02-27'],
    [29, '2026-02-28', '2026-02-28', '2026-03-28'],
    [31, '2026-03-15', '2026-02-28', '2026-03-30'],
    [31, '2026-02-28', '2026-02-28', '2026-03-30'],
    [29, '2024-02-29', '2024-02-29', '2024-03-28'],
    [29, '2027-01-10', '2026-12-29', '2027-01-28'],
    [1, '2026-10-16', '2026-10-01', '2026-10-31'],
  ])('N=%i, дата %s → %s … %s', (n, date, from, to) => {
    expect(periodContaining(date, 'cycle', n)).toEqual({ mode: 'cycle', from, to });
  });

  it('режим month — с 1-го по последний день, включая високосный февраль', () => {
    expect(periodContaining('2024-02-10', 'month')).toEqual({
      mode: 'month',
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });

  it('выбрасывает RangeError на некорректной дате и дне начала', () => {
    expect(() => periodContaining('2026-02-30', 'cycle', 5)).toThrow(RangeError);
    expect(() => periodContaining('16.10.2026', 'month')).toThrow(RangeError);
    expect(() => periodContaining('2026-10-16', 'cycle', 32)).toThrow(RangeError);
  });
});

describe('shiftPeriod', () => {
  it('листает цикл через конец года', () => {
    const p = periodContaining('2026-12-30', 'cycle', 29);
    expect(shiftPeriod(p, 1, 29)).toEqual({ mode: 'cycle', from: '2027-01-29', to: '2027-02-27' });
    expect(shiftPeriod(p, -1, 29)).toEqual({ mode: 'cycle', from: '2026-11-29', to: '2026-12-28' });
  });

  it('сдвигает диапазон на его длину', () => {
    const range = { mode: 'range' as const, from: '2026-10-01', to: '2026-10-10' };
    expect(shiftPeriod(range, 1)).toEqual({ mode: 'range', from: '2026-10-11', to: '2026-10-20' });
  });
});

describe('formatPeriodLabel', () => {
  it('месяц, цикл и цикл через год', () => {
    expect(formatPeriodLabel(periodContaining('2026-10-16', 'month'))).toBe('Октябрь 2026');
    expect(formatPeriodLabel(periodContaining('2026-10-16', 'cycle', 29))).toBe(
      '29 сентября – 28 октября 2026',
    );
    expect(formatPeriodLabel(periodContaining('2027-01-10', 'cycle', 29))).toBe(
      '29 декабря 2026 – 28 января 2027',
    );
  });
});

describe('validateRange и periodFromParams', () => {
  it('отклоняет конец раньше начала и слишком длинный диапазон', () => {
    expect(validateRange('2026-10-10', '2026-10-01')).toBe('Дата окончания раньше даты начала');
    expect(validateRange('2020-01-01', '2026-01-01')).toBe('Диапазон не может быть длиннее 5 лет');
    expect(validateRange('2026-10-01', '2026-10-01')).toBeNull();
  });

  it('читает корректные параметры и игнорирует мусор', () => {
    expect(
      periodFromParams(new URLSearchParams('mode=range&from=2026-10-01&to=2026-10-05')),
    ).toEqual({
      mode: 'range',
      from: '2026-10-01',
      to: '2026-10-05',
    });
    expect(
      periodFromParams(new URLSearchParams('mode=week&from=2026-10-01&to=2026-10-05')),
    ).toBeNull();
    expect(
      periodFromParams(new URLSearchParams('mode=month&from=2026-13-01&to=2026-10-05')),
    ).toBeNull();
  });
});
