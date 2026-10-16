import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getDaysInMonth,
  getElapsedDays,
  getMonthOfDate,
  isValidIsoDate,
  isValidMonth,
} from './month';

describe('isValidMonth', () => {
  test('принимает корректные месяцы', () => {
    assert.equal(isValidMonth('2026-10'), true);
    assert.equal(isValidMonth('2026-01'), true);
    assert.equal(isValidMonth('2026-12'), true);
  });

  test('отклоняет неверный формат и несуществующие месяцы', () => {
    assert.equal(isValidMonth('2026-13'), false);
    assert.equal(isValidMonth('2026-00'), false);
    assert.equal(isValidMonth('2026-1'), false);
    assert.equal(isValidMonth('2026-10-16'), false);
    assert.equal(isValidMonth(' 2026-10'), false);
    assert.equal(isValidMonth(''), false);
  });
});

describe('getDaysInMonth', () => {
  test('возвращает число дней обычных месяцев', () => {
    assert.equal(getDaysInMonth('2026-10'), 31);
    assert.equal(getDaysInMonth('2026-11'), 30);
    assert.equal(getDaysInMonth('2026-12'), 31);
  });

  test('учитывает високосные годы', () => {
    assert.equal(getDaysInMonth('2026-02'), 28);
    assert.equal(getDaysInMonth('2024-02'), 29);
    assert.equal(getDaysInMonth('2000-02'), 29);
    assert.equal(getDaysInMonth('2100-02'), 28);
  });

  test('бросает ошибку на некорректный месяц', () => {
    assert.throws(() => getDaysInMonth('2026-13'), RangeError);
    assert.throws(() => getDaysInMonth('октябрь'), RangeError);
  });
});

describe('isValidIsoDate', () => {
  test('принимает существующие даты', () => {
    assert.equal(isValidIsoDate('2026-10-16'), true);
    assert.equal(isValidIsoDate('2024-02-29'), true);
    assert.equal(isValidIsoDate('2026-12-31'), true);
  });

  test('отклоняет несуществующие даты и неверный формат', () => {
    assert.equal(isValidIsoDate('2026-02-29'), false);
    assert.equal(isValidIsoDate('2026-04-31'), false);
    assert.equal(isValidIsoDate('2026-10-00'), false);
    assert.equal(isValidIsoDate('2026-10-1'), false);
    assert.equal(isValidIsoDate('2026-10-16T10:00:00Z'), false);
    assert.equal(isValidIsoDate('16.10.2026'), false);
  });
});

describe('getMonthOfDate', () => {
  test('возвращает месяц даты', () => {
    assert.equal(getMonthOfDate('2026-10-16'), '2026-10');
  });

  test('граничные дни месяца относятся к своему месяцу', () => {
    assert.equal(getMonthOfDate('2026-10-01'), '2026-10');
    assert.equal(getMonthOfDate('2026-10-31'), '2026-10');
    assert.equal(getMonthOfDate('2026-11-01'), '2026-11');
  });

  test('бросает ошибку на некорректную дату', () => {
    assert.throws(() => getMonthOfDate('2026-02-30'), RangeError);
    assert.throws(() => getMonthOfDate(''), RangeError);
  });
});

describe('getElapsedDays', () => {
  test('текущий месяц: номер дня today включительно', () => {
    assert.equal(getElapsedDays('2026-10', '2026-10-16'), 16);
  });

  test('краевые случаи: первый и последний день, прошлый и будущий месяц', () => {
    assert.equal(getElapsedDays('2026-10', '2026-10-01'), 1);
    assert.equal(getElapsedDays('2026-10', '2026-10-31'), 31);
    assert.equal(getElapsedDays('2026-09', '2026-10-16'), 30);
    assert.equal(getElapsedDays('2024-02', '2026-10-16'), 29);
    assert.equal(getElapsedDays('2026-11', '2026-10-16'), 0);
    // смена года: декабрь прошлого года уже прошёл, январь следующего — ещё нет
    assert.equal(getElapsedDays('2025-12', '2026-01-05'), 31);
    assert.equal(getElapsedDays('2027-01', '2026-12-31'), 0);
  });

  test('бросает ошибку на некорректные аргументы', () => {
    assert.throws(() => getElapsedDays('2026-13', '2026-10-16'), RangeError);
    assert.throws(() => getElapsedDays('2026-10', '2026-10-32'), RangeError);
  });
});
