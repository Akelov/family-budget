import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, formatShortDate, formatSignedAmount } from '../src/format';

test('formatMoney: разделяет разряды и добавляет знак рубля', () => {
  assert.equal(formatMoney(12500), '12 500 ₽');
});

test('formatMoney: показывает копейки, только если они есть', () => {
  assert.equal(formatMoney(99.5), '99,5 ₽');
  assert.equal(formatMoney(100), '100 ₽');
});

test('formatMoney: бросает ошибку на NaN', () => {
  assert.throws(() => formatMoney(Number.NaN), RangeError);
});

test('formatSignedAmount: расход с минусом, доход с плюсом', () => {
  assert.equal(formatSignedAmount(1200, 'expense'), '−1 200 ₽');
  assert.equal(formatSignedAmount(50000, 'income'), '+50 000 ₽');
});

test('formatShortDate: короткая русская дата', () => {
  assert.equal(formatShortDate('2026-10-16'), '16 окт.');
});

test('formatShortDate: бросает ошибку на мусорной строке', () => {
  assert.throws(() => formatShortDate('вчера'), RangeError);
});
