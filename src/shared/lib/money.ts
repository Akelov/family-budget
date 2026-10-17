/** Сколько копеек в одном рубле. */
export const KOPECKS_PER_RUBLE = 100;

/** Максимальная сумма операции: 9 999 999 999,99 ₽ (предел numeric(12,2), FR-3.3). */
export const MAX_AMOUNT_KOPECKS = 999_999_999_999;

const AMOUNT_PATTERN = /^(\d{1,10})(?:[.,](\d{1,2}))?$/;

/**
 * Разбирает сумму, введённую пользователем, в целое число копеек.
 *
 * Строка разбирается посимвольно, без `parseFloat`: так не возникает ошибок округления
 * float (`0.29 * 100 = 28.999…`). Пробелы (в том числе неразрывные) игнорируются,
 * разделитель дробной части — «,» или «.».
 *
 * @param input - строка из поля «Сумма», например `"2 500,50"`
 * @returns копейки или `null`, если сумма некорректна: пусто, ноль, больше 2 знаков
 *   после запятой, больше максимума или посторонние символы
 */
export function parseAmount(input: string): number | null {
  const normalized = input.replace(/[\s\u00a0\u202f]/g, '');
  const match = AMOUNT_PATTERN.exec(normalized);
  if (!match) return null;
  const rubles = Number(match[1]);
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const kopecks = rubles * KOPECKS_PER_RUBLE + Number(fraction);
  if (kopecks <= 0 || kopecks > MAX_AMOUNT_KOPECKS) return null;
  return kopecks;
}

/**
 * Проверяет, что значение — корректная неотрицательная сумма в копейках.
 *
 * @param kopecks - проверяемое значение
 * @param label - название параметра для текста ошибки
 * @throws {RangeError} если значение не целое, отрицательное или вне безопасных целых чисел
 */
export function assertValidKopecks(kopecks: number, label = 'Сумма'): void {
  if (!Number.isSafeInteger(kopecks) || kopecks < 0) {
    throw new RangeError(
      `${label}: ожидается неотрицательное целое число копеек, получено ${kopecks}`,
    );
  }
}

/**
 * Переводит копейки в строку для поля ввода: `250050` → `"2500,5"`.
 * Используется при открытии формы изменения операции.
 *
 * @param kopecks - неотрицательное целое число копеек
 * @throws {RangeError} если значение некорректно
 */
export function kopecksToInput(kopecks: number): string {
  assertValidKopecks(kopecks);
  const rubles = Math.trunc(kopecks / KOPECKS_PER_RUBLE);
  const rest = kopecks % KOPECKS_PER_RUBLE;
  if (rest === 0) return String(rubles);
  return `${rubles},${String(rest).padStart(2, '0').replace(/0$/, '')}`;
}

type SignMode = 'none' | 'always' | 'negative';

interface FormatMoneyOptions {
  /** `always` — «+» и «−» (операции), `negative` — только «−» (остаток), `none` — без знака. */
  sign?: SignMode;
}

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const rubFormatterCents = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Форматирует сумму в копейках для вывода: `250000` → `"2 500 ₽"`, `1` → `"0,01 ₽"`.
 *
 * Копейки показываются, только если они есть (NFR-G6). Знак минуса — типографский «−».
 * Деление на 100 здесь безопасно: это вывод, а не расчёт.
 *
 * @param kopecks - целое число копеек, может быть отрицательным
 * @param options - режим знака
 * @throws {RangeError} если значение не является безопасным целым числом
 */
export function formatMoney(kopecks: number, options: FormatMoneyOptions = {}): string {
  if (!Number.isSafeInteger(kopecks)) {
    throw new RangeError(`Сумма в копейках должна быть целым числом: ${kopecks}`);
  }
  const { sign = 'none' } = options;
  const abs = Math.abs(kopecks);
  const formatter = abs % KOPECKS_PER_RUBLE === 0 ? rubFormatter : rubFormatterCents;
  // Intl ставит узкий неразрывный пробел (U+202F) между разрядами: заменяем на обычный
  // неразрывный, чтобы строки одинаково выглядели во всех шрифтах и тестах.
  const body = formatter.format(abs / KOPECKS_PER_RUBLE).replace(/\u202f/g, '\u00a0');
  if (kopecks < 0 && sign !== 'none') return `−${body}`;
  if (kopecks > 0 && sign === 'always') return `+${body}`;
  return body;
}
