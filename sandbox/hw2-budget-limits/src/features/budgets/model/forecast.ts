import { assertValidKopecks } from '@/shared/lib/money';
import { getDaysInMonth, getElapsedDays } from '@/shared/lib/month';

/**
 * Прогнозирует расходы на весь месяц при текущем темпе трат (линейная экстраполяция):
 * `потрачено / прошедшие дни × дней в месяце`, где сегодняшний день считается прошедшим.
 *
 * Ограничение модели: в первые дни месяца прогноз сильно скачет. Одна крупная разовая
 * трата 1-го числа (аренда, абонемент) умножается на число дней месяца — 30 000 ₽
 * 1 октября дают прогноз 930 000 ₽. Модель не отличает регулярные траты от разовых;
 * интерпретировать прогноз в начале месяца нужно с осторожностью.
 *
 * @param spentKopecks - потрачено с начала месяца по `today`, копейки
 * @param month - расчётный месяц в формате `YYYY-MM`
 * @param today - текущая дата `YYYY-MM-DD` (передаётся явно, чтобы функция была чистой)
 * @returns прогноз в копейках, округлённый до целой копейки; для прошедшего месяца —
 *   ровно `spentKopecks` (месяц закрыт, факт известен); `null`, если месяц ещё не начался
 * @throws {RangeError} если сумма не является неотрицательным целым числом копеек
 *   или месяц / дата некорректны
 */
export function forecastMonthSpending(
  spentKopecks: number,
  month: string,
  today: string,
): number | null {
  assertValidKopecks(spentKopecks, 'Сумма расходов');
  const elapsedDays = getElapsedDays(month, today);
  const daysInMonth = getDaysInMonth(month);

  if (elapsedDays === 0) {
    return null;
  }
  if (elapsedDays === daysInMonth) {
    return spentKopecks;
  }
  return roundedRatioKopecks(spentKopecks, daysInMonth, elapsedDays);
}

/**
 * `round(value × numerator / denominator)` точно в BigInt: во float произведение
 * свыше 2^53 теряет младшие разряды, и прогноз «уезжает» на копейки.
 * Округление — половина вверх, как у `Math.round` для неотрицательных чисел.
 */
function roundedRatioKopecks(value: number, numerator: number, denominator: number): number {
  const doubled = BigInt(value) * BigInt(numerator) * 2n + BigInt(denominator);
  const result = Number(doubled / (BigInt(denominator) * 2n));
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`Прогноз расходов слишком велик: ${result}`);
  }
  return result;
}
