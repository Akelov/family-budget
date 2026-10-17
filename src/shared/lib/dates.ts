/** Разобранная дата без часового пояса. */
export interface DateParts {
  year: number;
  month: number; // 1–12
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

const MONTHS_NOMINATIVE = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

const WEEKDAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
] as const;

/**
 * Возвращает число дней в месяце с учётом високосных лет.
 *
 * @param year - год
 * @param month - месяц 1–12
 */
export function daysInMonth(year: number, month: number): number {
  // Date.UTC с днём 0 даёт последний день предыдущего месяца — без влияния часового пояса.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Разбирает дату `YYYY-MM-DD` как строку (без `new Date(iso)`, чтобы пояс не сдвигал день).
 *
 * @param iso - дата в ISO-формате
 * @throws {RangeError} если формат неверен или такой даты нет (например, `2026-02-30`)
 */
export function parseIsoDate(iso: string): DateParts {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new RangeError(`Некорректная дата: ${iso}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`Некорректная дата: ${iso}`);
  }
  return { year, month, day };
}

/** Проверяет формат и существование даты `YYYY-MM-DD`, не выбрасывая исключений. */
export function isIsoDate(value: string): boolean {
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

/** Собирает строку `YYYY-MM-DD` из частей. */
export function toIsoDate({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Сдвигает дату на `days` дней (может быть отрицательным).
 *
 * @param iso - исходная дата `YYYY-MM-DD`
 * @param days - целое число дней
 * @throws {RangeError} если дата некорректна
 */
export function addDays(iso: string, days: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return toIsoDate({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

/** Сравнивает ISO-даты: строки `YYYY-MM-DD` упорядочены так же, как даты. */
export function compareIsoDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Число дней между датами включительно (`from` ≤ `to`). */
export function daysBetweenInclusive(from: string, to: string): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Сегодняшняя дата в часовом поясе пользователя.
 *
 * @param now - текущий момент (параметр нужен для тестов)
 */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

/** День недели 0–6 (0 — воскресенье) для ISO-даты. */
function weekday(iso: string): number {
  const { year, month, day } = parseIsoDate(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** «Вторник, 14 октября 2026 г.» — заголовок дня в истории (FR-3.8). */
export function formatDayTitle(iso: string): string {
  const { year, month, day } = parseIsoDate(iso);
  return `${WEEKDAYS[weekday(iso)]}, ${day} ${MONTHS_GENITIVE[month - 1]} ${year} г.`;
}

/** «14 окт.» — короткая дата для таблицы. */
export function formatShortDate(iso: string): string {
  const { month, day } = parseIsoDate(iso);
  return `${day} ${(MONTHS_GENITIVE[month - 1] ?? '').slice(0, 3)}.`;
}

/** «14 октября» или «14 октября 2025», если год не равен `currentYear`. */
export function formatDayMonth(iso: string, currentYear?: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const base = `${day} ${MONTHS_GENITIVE[month - 1]}`;
  return currentYear === undefined || currentYear === year ? base : `${base} ${year}`;
}

/** «Октябрь 2026». */
export function formatMonthTitle(year: number, month: number): string {
  return `${MONTHS_NOMINATIVE[month - 1]} ${year}`;
}

export { MONTHS_GENITIVE };
