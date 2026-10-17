/** Нормализует название для сравнения без учёта регистра и пробелов по краям (FR-2.7). */
export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('ru-RU');
}

/**
 * Склоняет существительное после числа: `pluralize(5, ['операция', 'операции', 'операций'])`.
 *
 * @param count - целое число
 * @param forms - формы для 1, 2–4 и 5+
 */
export function pluralize(count: number, forms: readonly [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
