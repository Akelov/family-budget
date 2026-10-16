// Допуск на погрешность float при умножении на 100 (например, 1.15 * 100 = 114.99999999999999).
// Погрешность растёт с величиной числа, поэтому для больших сумм допуск относительный.
const MIN_KOPECKS_TOLERANCE = 1e-6;
const RELATIVE_TOLERANCE_FACTOR = 16;

function getKopecksTolerance(scaled: number): number {
  const relativeTolerance = Math.abs(scaled) * Number.EPSILON * RELATIVE_TOLERANCE_FACTOR;
  return Math.max(MIN_KOPECKS_TOLERANCE, relativeTolerance);
}

/**
 * Переводит сумму в рублях в целое число копеек.
 *
 * @param amount - сумма в рублях, не более 2 знаков после запятой (как `numeric(12,2)` в БД).
 * @returns целое число копеек.
 * @throws {RangeError} если сумма не конечное число (`NaN`, `Infinity`)
 *   или содержит больше 2 знаков после запятой.
 *
 * @example toKopecks(1.15) // 115
 */
export function toKopecks(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Сумма должна быть конечным числом, получено: ${amount}`);
  }

  const scaled = amount * 100;
  const kopecks = Math.round(scaled);

  if (Math.abs(scaled - kopecks) > getKopecksTolerance(scaled)) {
    throw new RangeError(`Сумма не может содержать больше 2 знаков после запятой: ${amount}`);
  }

  // Math.round(-0.001) даёт -0 — нормализуем, чтобы не протекал отрицательный ноль.
  return kopecks === 0 ? 0 : kopecks;
}

/**
 * Переводит целое число копеек в рубли.
 *
 * @param kopecks - целое число копеек (может быть отрицательным, например для баланса).
 * @returns сумма в рублях.
 * @throws {RangeError} если передано не целое число.
 *
 * @example fromKopecks(115) // 1.15
 */
export function fromKopecks(kopecks: number): number {
  if (!Number.isSafeInteger(kopecks)) {
    throw new RangeError(`Количество копеек должно быть целым числом, получено: ${kopecks}`);
  }

  return kopecks / 100;
}
