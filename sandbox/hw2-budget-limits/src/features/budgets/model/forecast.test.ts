import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { toKopecks } from '@/shared/lib/money';

import { forecastMonthSpending } from './forecast';

describe('forecastMonthSpending', () => {
  test('16 000 ₽ за 16 дней октября → 31 000 ₽', () => {
    assert.equal(
      forecastMonthSpending(toKopecks(16_000), '2026-10', '2026-10-16'),
      toKopecks(31_000),
    );
  });

  test('округляет до целой копейки', () => {
    // 100 копеек × 31 / 3 = 1033,33… → 1033
    assert.equal(forecastMonthSpending(100, '2026-10', '2026-10-03'), 1033);
    // 1 копейка × 31 / 2 = 15,5 → 16
    assert.equal(forecastMonthSpending(1, '2026-10', '2026-10-02'), 16);
  });

  test('первый день месяца: без деления на ноль, трата умножается на число дней', () => {
    assert.equal(
      forecastMonthSpending(toKopecks(30_000), '2026-10', '2026-10-01'),
      toKopecks(930_000),
    );
  });

  test('последний день и прошедший месяц: прогноз равен факту', () => {
    assert.equal(forecastMonthSpending(12_345, '2026-10', '2026-10-31'), 12_345);
    assert.equal(forecastMonthSpending(12_345, '2026-09', '2026-10-16'), 12_345);
  });

  test('будущий месяц: прогноза нет', () => {
    assert.equal(forecastMonthSpending(0, '2026-11', '2026-10-16'), null);
    assert.equal(forecastMonthSpending(0, '2027-01', '2026-12-31'), null);
  });

  test('високосный февраль: 29 дней в расчёте', () => {
    assert.equal(forecastMonthSpending(toKopecks(1000), '2024-02', '2024-02-10'), toKopecks(2900));
    assert.equal(forecastMonthSpending(toKopecks(1000), '2026-02', '2026-02-10'), toKopecks(2800));
  });

  test('без трат прогноз 0', () => {
    assert.equal(forecastMonthSpending(0, '2026-10', '2026-10-16'), 0);
  });

  test('прогноз точен и на суммах, где spent × 31 выходит за 2^53', () => {
    // регрессия: во float 1 000 000 000 000 009 × 31 / 16 давало ...018 вместо ...017
    assert.equal(
      forecastMonthSpending(1_000_000_000_000_009, '2026-10', '2026-10-16'),
      1_937_500_000_000_017,
    );
  });

  test('бросает ошибку на некорректные аргументы и слишком большой прогноз', () => {
    assert.throws(
      () => forecastMonthSpending(Number.MAX_SAFE_INTEGER, '2026-10', '2026-10-01'),
      /Прогноз расходов слишком велик/,
    );
    assert.throws(() => forecastMonthSpending(-1, '2026-10', '2026-10-16'), RangeError);
    assert.throws(() => forecastMonthSpending(10.5, '2026-10', '2026-10-16'), RangeError);
    assert.throws(() => forecastMonthSpending(100, '2026-13', '2026-10-16'), RangeError);
    assert.throws(() => forecastMonthSpending(100, '2026-10', '2026-10-32'), RangeError);
  });
});
