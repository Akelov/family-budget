/** Сколько копеек в одном рубле */
export const KOPECKS_PER_RUBLE = 100;

/**
 * Переводит сумму в рублях в целое число копеек.
 *
 * Вся денежная арифметика ведётся в копейках, потому что `0.1 + 0.2 !== 0.3` во float.
 * Умножение на 100 тоже даёт погрешность (`0.29 * 100 === 28.999999999999996`),
 * поэтому результат округляется, а затем проверяется обратным переводом: так
 * отсекаются суммы с лишними знаками (`1.005`) и «грязные» результаты float-расчётов
 * (`0.1 + 0.2`) — их нельзя молча округлять, это ошибка выше по цепочке.
 *
 * @param rubles - неотрицательная сумма в рублях, не более 2 знаков после запятой
 * @returns целое число копеек
 * @throws {RangeError} если сумма не конечна, отрицательна, содержит больше
 *   2 знаков после запятой или выходит за пределы безопасных целых чисел
 */
export function toKopecks(rubles: number): number {
  if (!Number.isFinite(rubles)) {
    throw new RangeError(`Некорректная сумма: ${rubles}`);
  }
  if (rubles < 0) {
    throw new RangeError(`Сумма не может быть отрицательной: ${rubles}`);
  }
  const kopecks = Math.round(rubles * KOPECKS_PER_RUBLE);
  if (!Number.isSafeInteger(kopecks)) {
    throw new RangeError(`Сумма слишком велика: ${rubles}`);
  }
  if (kopecks / KOPECKS_PER_RUBLE !== rubles) {
    throw new RangeError(`Сумма должна содержать не более 2 знаков после запятой: ${rubles}`);
  }
  return kopecks;
}

/**
 * Проверяет, что значение — корректная неотрицательная сумма в копейках.
 * Используется на входе расчётных функций, принимающих копейки.
 *
 * @param kopecks - проверяемое значение
 * @param label - название параметра для текста ошибки, например `"Лимит"`
 * @throws {RangeError} если значение не целое, отрицательное или вне безопасных целых чисел
 */
export function assertValidKopecks(kopecks: number, label = 'Сумма'): void {
  if (!Number.isSafeInteger(kopecks) || kopecks < 0) {
    throw new RangeError(`${label}: ожидается неотрицательное целое число копеек, получено ${kopecks}`);
  }
}

/**
 * Переводит целое число копеек обратно в рубли — для вывода через `formatMoney`
 * и для отдачи наружу из модулей бизнес-логики.
 *
 * Отрицательные значения допустимы: это просто перевод единиц, знак задаёт вызывающий код.
 *
 * @param kopecks - целое число копеек в пределах безопасных целых чисел
 * @returns сумма в рублях (деление на 100 даёт ближайшее к точному значению число)
 * @throws {RangeError} если значение не является безопасным целым числом
 */
export function fromKopecks(kopecks: number): number {
  if (!Number.isSafeInteger(kopecks)) {
    throw new RangeError(`Сумма в копейках должна быть целым числом: ${kopecks}`);
  }
  return kopecks / KOPECKS_PER_RUBLE;
}
