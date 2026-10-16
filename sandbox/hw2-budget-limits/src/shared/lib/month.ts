// Все функции работают со строками и числами, без `new Date(isoString)`:
// `new Date('2026-10-01')` разбирается как UTC и в часовых поясах западнее UTC
// превращается в 30 сентября, что ломает отнесение операции к месяцу.

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN = /^(\d{4}-(?:0[1-9]|1[0-2]))-(\d{2})$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

interface ParsedMonth {
  year: number;
  monthNumber: number;
}

function parseMonth(month: string): ParsedMonth | null {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), monthNumber: Number(match[2]) };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInParsedMonth({ year, monthNumber }: ParsedMonth): number {
  if (monthNumber === 2 && isLeapYear(year)) {
    return 29;
  }
  // monthNumber гарантированно 1–12 после проверки регуляркой
  return DAYS_IN_MONTH[monthNumber - 1] ?? 31;
}

/**
 * Проверяет, что строка — месяц в формате `YYYY-MM`.
 *
 * @param month - проверяемая строка, например `"2026-10"`
 * @returns `true` для корректного месяца; `false` для `"2026-13"`, `"2026-1"`, `""`
 */
export function isValidMonth(month: string): boolean {
  return parseMonth(month) !== null;
}

/**
 * Возвращает число дней в месяце с учётом високосных лет.
 *
 * @param month - месяц в формате `YYYY-MM`
 * @returns 28–31; для `"2024-02"` — 29, для `"2100-02"` — 28 (не високосный)
 * @throws {RangeError} если месяц имеет неверный формат
 */
export function getDaysInMonth(month: string): number {
  const parsed = parseMonth(month);
  if (!parsed) {
    throw new RangeError(`Некорректный месяц: ${month}`);
  }
  return daysInParsedMonth(parsed);
}

/**
 * Проверяет, что строка — существующая дата в формате `YYYY-MM-DD`.
 *
 * @param isoDate - проверяемая строка, например `"2026-10-16"`
 * @returns `true` для корректной даты; `false` для `"2026-02-30"`, `"2026-10-1"`, `"2026-10-16T10:00"`
 */
export function isValidIsoDate(isoDate: string): boolean {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  const parsed = match ? parseMonth(match[1] ?? '') : null;
  if (!match || !parsed) {
    return false;
  }
  const day = Number(match[2]);
  return day >= 1 && day <= daysInParsedMonth(parsed);
}

/**
 * Возвращает месяц (`YYYY-MM`), к которому относится дата.
 *
 * @param isoDate - дата в формате `YYYY-MM-DD`
 * @returns месяц, например `"2026-10"` для `"2026-10-31"`
 * @throws {RangeError} если дата некорректна или не существует
 */
export function getMonthOfDate(isoDate: string): string {
  if (!isValidIsoDate(isoDate)) {
    throw new RangeError(`Некорректная дата: ${isoDate}`);
  }
  return isoDate.slice(0, 7);
}

/**
 * Считает, сколько дней месяца уже прошло на дату `today`, включая сам `today`.
 * Нужна для линейного прогноза трат: «потрачено / прошедшие дни × дней в месяце».
 *
 * @param month - расчётный месяц в формате `YYYY-MM`
 * @param today - текущая дата в формате `YYYY-MM-DD` (передаётся явно, чтобы функция была чистой)
 * @returns 0 — если месяц ещё не начался; число дней месяца — если месяц уже прошёл;
 *   номер дня `today` (от 1) — если `today` внутри месяца
 * @throws {RangeError} если месяц или дата некорректны
 */
export function getElapsedDays(month: string, today: string): number {
  const daysInMonth = getDaysInMonth(month);
  const todayMonth = getMonthOfDate(today);
  // Формат YYYY-MM фиксированной ширины, поэтому строковое сравнение = хронологическое
  if (todayMonth < month) {
    return 0;
  }
  if (todayMonth > month) {
    return daysInMonth;
  }
  return Number(today.slice(8, 10));
}
