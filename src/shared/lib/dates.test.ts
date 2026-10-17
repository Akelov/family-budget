import { describe, expect, it } from 'vitest';

import { addDays, formatDayTitle, isIsoDate, parseIsoDate, todayIso } from './dates';

describe('dates', () => {
  it('разбирает дату как строку и проверяет её существование', () => {
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-1-5')).toBe(false);
    expect(() => parseIsoDate('2026-13-01')).toThrow(RangeError);
  });

  it('сдвигает дату через границы месяца и года', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('форматирует заголовок дня', () => {
    expect(formatDayTitle('2026-10-14')).toBe('Среда, 14 октября 2026 г.');
  });

  it('todayIso берёт локальную дату', () => {
    expect(todayIso(new Date(2026, 9, 17, 23, 59))).toBe('2026-10-17');
  });
});
