import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { normalizeCategory } from './category';

describe('normalizeCategory', () => {
  test('приводит разные написания к одному ключу', () => {
    assert.equal(normalizeCategory('Продукты'), 'продукты');
    assert.equal(normalizeCategory('  продукты '), 'продукты');
    assert.equal(normalizeCategory('ПРОДУКТЫ'), 'продукты');
  });

  test('краевые случаи: ё, латиница, внутренние пробелы сохраняются', () => {
    assert.equal(normalizeCategory('Ёлка'), 'ёлка');
    assert.equal(normalizeCategory('Netflix'), 'netflix');
    assert.equal(normalizeCategory('Кафе и рестораны'), 'кафе и рестораны');
    assert.notEqual(normalizeCategory('Кафе  и рестораны'), 'кафе и рестораны');
  });

  test('бросает ошибку на пустое название', () => {
    assert.throws(() => normalizeCategory(''), RangeError);
    assert.throws(() => normalizeCategory('   '), RangeError);
  });
});
