import { describe, expect, it } from 'vitest';

import { toBudget, toCategory } from './supabaseRows';

describe('перевод строк Supabase в доменные типы', () => {
  it('бюджет: сумма-строка из numeric → копейки, элементы — категория или подкатегория', () => {
    const budget = toBudget({
      id: 'b1',
      name: 'Авто',
      amount: '20000.50',
      archived_at: null,
      created_at: '2026-10-17T10:00:00Z',
      budget_items: [
        { category_id: 'c1', subcategory_id: null },
        { category_id: null, subcategory_id: 's1' },
      ],
    });
    expect(budget.amount).toBe(2_000_050);
    expect(budget.items).toEqual([
      { kind: 'category', categoryId: 'c1' },
      { kind: 'subcategory', subcategoryId: 's1' },
    ]);
  });

  it('цвет вне палитры заменяется на «прочее» (12)', () => {
    expect(
      toCategory({ id: 'c', type: 'expense', name: 'X', color: 99, icon: 'x', archived_at: null })
        .color,
    ).toBe(12);
  });
});
