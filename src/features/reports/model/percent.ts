/**
 * Переводит суммы в целые проценты так, чтобы их сумма была ровно 100 (FR-4.5).
 *
 * Метод наибольшего остатка: каждой доле даётся целая часть, а недостающие до 100 пункты
 * получают доли с наибольшей дробной частью (при равенстве — более крупная сумма, затем
 * более ранняя позиция). Считается в целых числах, без float.
 *
 * @param amounts - неотрицательные целые суммы (копейки)
 * @returns проценты в том же порядке; при нулевой сумме — все нули
 * @throws {RangeError} если есть отрицательные или нецелые значения
 */
export function largestRemainderPercents(amounts: readonly number[]): number[] {
  if (amounts.some((a) => !Number.isSafeInteger(a) || a < 0)) {
    throw new RangeError('Суммы для процентов должны быть неотрицательными целыми числами');
  }
  const total = amounts.reduce((sum, a) => sum + a, 0);
  if (total === 0) return amounts.map(() => 0);
  // Произведения могут выйти за 2^53 на очень больших суммах — считаем в BigInt.
  const bigTotal = BigInt(total);
  const parts = amounts.map((a, index) => {
    const scaled = BigInt(a) * 100n;
    return { index, amount: a, floor: Number(scaled / bigTotal), remainder: scaled % bigTotal };
  });
  const missing = 100 - parts.reduce((sum, p) => sum + p.floor, 0);
  const bonus = new Set(
    [...parts]
      .sort((x, y) =>
        x.remainder !== y.remainder
          ? y.remainder > x.remainder
            ? 1
            : -1
          : y.amount - x.amount || x.index - y.index,
      )
      .slice(0, missing)
      .map((p) => p.index),
  );
  return parts.map((p) => p.floor + (bonus.has(p.index) ? 1 : 0));
}
