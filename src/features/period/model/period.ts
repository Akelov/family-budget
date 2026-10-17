import {
  addDays,
  daysBetweenInclusive,
  daysInMonth,
  formatDayMonth,
  formatMonthTitle,
  parseIsoDate,
  toIsoDate,
} from '@/shared/lib/dates';
import type { FamilyPeriodMode, Period, PeriodMode } from '@/shared/types/domain';

/** Максимальная длина произвольного диапазона — 5 лет (FR-3.14). */
export const MAX_RANGE_DAYS = 366 * 5;

/**
 * Проверяет день начала цикла (1–31).
 *
 * @throws {RangeError} если день не целый или вне диапазона
 */
function assertStartDay(startDay: number): void {
  if (!Number.isInteger(startDay) || startDay < 1 || startDay > 31) {
    throw new RangeError(`День начала периода должен быть от 1 до 31: ${startDay}`);
  }
}

/** `s(Y, M) = min(N, дней в месяце)` из FR-5.5. */
function cycleStartInMonth(year: number, month: number, startDay: number): number {
  return Math.min(startDay, daysInMonth(year, month));
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * Возвращает период режима `month` или `cycle`, содержащий дату (FR-5.5).
 *
 * Для `cycle` начало — день N текущего месяца, если он уже наступил, иначе день N
 * предыдущего месяца; в коротких месяцах N сжимается до последнего дня. Конец — день
 * перед началом следующего периода. Режим `month` — это цикл с N = 1.
 *
 * @param date - дата `YYYY-MM-DD`
 * @param mode - `month` или `cycle`
 * @param startDay - день начала цикла 1–31 (для `month` игнорируется)
 * @throws {RangeError} если дата или день начала некорректны
 * @example periodContaining('2026-10-16', 'cycle', 29) // 2026-09-29 … 2026-10-28
 */
export function periodContaining(date: string, mode: FamilyPeriodMode, startDay = 1): Period {
  const n = mode === 'month' ? 1 : startDay;
  assertStartDay(n);
  const { year, month, day } = parseIsoDate(date);
  const sCurrent = cycleStartInMonth(year, month, n);
  const startMonth = day >= sCurrent ? { year, month } : previousMonth(year, month);
  const from = toIsoDate({
    ...startMonth,
    day: cycleStartInMonth(startMonth.year, startMonth.month, n),
  });
  const following = nextMonth(startMonth.year, startMonth.month);
  const nextStart = toIsoDate({
    ...following,
    day: cycleStartInMonth(following.year, following.month, n),
  });
  return { mode, from, to: addDays(nextStart, -1) };
}

/**
 * Листает период на один шаг назад (`-1`) или вперёд (`1`).
 * `range` сдвигается на свою длину (FR-3.14).
 *
 * @param period - текущий период
 * @param direction - направление
 * @param startDay - день начала цикла для режима `cycle`
 */
export function shiftPeriod(period: Period, direction: -1 | 1, startDay = 1): Period {
  if (period.mode === 'range') {
    const length = daysBetweenInclusive(period.from, period.to);
    return {
      mode: 'range',
      from: addDays(period.from, direction * length),
      to: addDays(period.to, direction * length),
    };
  }
  const anchor = direction === -1 ? addDays(period.from, -1) : addDays(period.to, 1);
  return periodContaining(anchor, period.mode, startDay);
}

/**
 * Подпись периода (FR-5.6): `month` — «Октябрь 2026»; `cycle`/`range` —
 * «29 сентября – 28 октября 2026», через год — «29 декабря 2026 – 28 января 2027».
 */
export function formatPeriodLabel(period: Period): string {
  const from = parseIsoDate(period.from);
  const to = parseIsoDate(period.to);
  if (period.mode === 'month') return formatMonthTitle(from.year, from.month);
  if (period.from === period.to) return `${formatDayMonth(period.from)} ${from.year}`;
  if (from.year === to.year) {
    return `${formatDayMonth(period.from)} – ${formatDayMonth(period.to)} ${to.year}`;
  }
  return `${formatDayMonth(period.from)} ${from.year} – ${formatDayMonth(period.to)} ${to.year}`;
}

/** Результат проверки диапазона: `null` — корректен, иначе текст ошибки. */
export function validateRange(from: string, to: string): string | null {
  if (to < from) return 'Дата окончания раньше даты начала';
  if (daysBetweenInclusive(from, to) > MAX_RANGE_DAYS)
    return 'Диапазон не может быть длиннее 5 лет';
  return null;
}

/** Содержит ли период дату. */
export function isInPeriod(date: string, period: Pick<Period, 'from' | 'to'>): boolean {
  return date >= period.from && date <= period.to;
}

/** Совпадают ли периоды. */
export function isSamePeriod(a: Period, b: Period): boolean {
  return a.mode === b.mode && a.from === b.from && a.to === b.to;
}

/**
 * Восстанавливает период из параметров адреса (`mode`, `from`, `to`).
 * Некорректные параметры не роняют экран: возвращается `null`, и экран берёт период по умолчанию.
 */
export function periodFromParams(params: URLSearchParams): Period | null {
  const mode = params.get('mode');
  const from = params.get('from');
  const to = params.get('to');
  if (!from || !to || !isPeriodMode(mode)) return null;
  try {
    parseIsoDate(from);
    parseIsoDate(to);
  } catch {
    return null;
  }
  if (validateRange(from, to) !== null) return null;
  return { mode, from, to };
}

function isPeriodMode(value: string | null): value is PeriodMode {
  return value === 'month' || value === 'cycle' || value === 'range';
}
