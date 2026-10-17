import { describe, expect, it } from 'vitest';

import { makeTx, seed } from '@/test/fixtures';

import { isCategoryInUse, isSubcategoryInUse, validateName } from './rules';

describe('validateName (FR-2.7)', () => {
  it('уникальность без учёта регистра и пробелов по краям', () => {
    expect(validateName('  продукты ', ['Продукты'])).toBe('Такое название уже есть');
    expect(validateName('Питомцы', ['Продукты'])).toBeNull();
  });

  it('пустое и слишком длинное название', () => {
    expect(validateName('   ', [])).toBe('Введите название');
    expect(validateName('я'.repeat(41), [])).toBe('Название — не длиннее 40 символов');
  });
});

describe('можно ли удалить (FR-2.5)', () => {
  it('подкатегория с операцией, даже удалённой, используется', () => {
    const txs = [makeTx({ subcategoryId: 'sub-pets', deletedAt: '2026-10-01T00:00:00.000Z' })];
    expect(isSubcategoryInUse('sub-pets', txs, [])).toBe(true);
    expect(isSubcategoryInUse('sub-other', txs, [])).toBe(false);
  });

  it('категория в бюджете используется', () => {
    const car = seed.categories.find((c) => c.id === 'cat-car');
    if (!car) throw new Error('нет категории в фикстуре');
    expect(isCategoryInUse(car, seed.subcategories, [], seed.budgets)).toBe(true);
  });
});
