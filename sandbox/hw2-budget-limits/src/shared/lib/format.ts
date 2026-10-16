import type { TransactionType } from './types';

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});

/**
 * Форматирует сумму в рублях: 12500 -> "12 500 ₽".
 * Неразрывные пробелы из Intl заменяются на обычные,
 * чтобы строку было удобно сравнивать и копировать.
 */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Некорректная сумма: ${amount}`);
  }
  return moneyFormatter.format(amount).replace(/[  ]/g, ' ');
}

/** Сумма со знаком: расход "−1 200 ₽", доход "+50 000 ₽" */
export function formatSignedAmount(amount: number, type: TransactionType): string {
  const sign = type === 'income' ? '+' : '−';
  return `${sign}${formatMoney(Math.abs(amount))}`;
}

/** Короткая дата: "2026-10-16" -> "16 окт." */
export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Некорректная дата: ${isoDate}`);
  }
  return dateFormatter.format(date);
}
