import { describe, expect, it } from 'vitest';

import { buildLookups } from '@/shared/lib/lookups';
import { lookups, seed, TODAY } from '@/test/fixtures';

import { firstErrorField, type TransactionFormValues, validateTransactionForm } from './validation';

const valid: TransactionFormValues = {
  type: 'expense',
  amount: '2 500,50',
  subcategoryId: 'sub-car-1',
  date: TODAY,
  comment: 'АЗС',
  tags: ['Отпуск в Сочи'],
};
const ctx = { today: TODAY, lookups };

describe('validateTransactionForm', () => {
  it('корректная форма — без ошибок', () => {
    expect(validateTransactionForm(valid, ctx)).toEqual({});
  });

  it('ошибки суммы, подкатегории, даты и тегов (§6.3)', () => {
    const errors = validateTransactionForm(
      {
        ...valid,
        amount: '1,005',
        subcategoryId: null,
        date: '2026-10-18',
        tags: Array.from({ length: 11 }, (_, i) => `тег ${i}`),
      },
      ctx,
    );
    expect(errors).toEqual({
      amount: 'Введите сумму больше 0 с точностью до копеек',
      subcategoryId: 'Выберите подкатегорию',
      date: 'Дата не может быть в будущем',
      tags: 'Не более 10 тегов на операцию',
    });
    expect(firstErrorField(errors)).toBe('amount');
  });

  it('подкатегория должна быть того же типа, что операция', () => {
    expect(validateTransactionForm({ ...valid, type: 'income' }, ctx).subcategoryId).toBe(
      'Выберите подкатегорию',
    );
  });

  it('архивную подкатегорию нельзя выбрать заново, но можно оставить при изменении (FR-2.6)', () => {
    const archived = buildLookups({
      ...seed,
      subcategories: seed.subcategories.map((s) =>
        s.id === 'sub-car-1' ? { ...s, archivedAt: '2026-10-01T00:00:00.000Z' } : s,
      ),
    });
    expect(validateTransactionForm(valid, { today: TODAY, lookups: archived }).subcategoryId).toBe(
      'Подкатегория больше недоступна, выберите другую',
    );
    expect(
      validateTransactionForm(valid, {
        today: TODAY,
        lookups: archived,
        initialSubcategoryId: 'sub-car-1',
      }),
    ).toEqual({});
  });
});
