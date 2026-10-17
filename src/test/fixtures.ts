import { createSeed } from '@/shared/api/seed';
import { buildLookups } from '@/shared/lib/lookups';
import type { Transaction } from '@/shared/types/domain';

/** «Сегодня» во всех тестах — чтобы результаты не зависели от даты запуска. */
export const TODAY = '2026-10-17';

export const seed = createSeed(TODAY);
export const lookups = buildLookups(seed);

let counter = 0;

/** Мок-операция с разумными значениями по умолчанию (правило 21 — только выдуманные данные). */
export function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  counter += 1;
  const stamp = `2026-10-10T10:00:${String(counter % 60).padStart(2, '0')}.000Z`;
  return {
    id: `t-${counter}`,
    type: 'expense',
    amount: 100_00,
    subcategoryId: 'sub-food-1',
    date: '2026-10-10',
    comment: '',
    tagIds: [],
    authorId: 'm-alexey',
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: null,
    ...overrides,
  };
}
