import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import { readDb, resetDb, setFailMode, writeDb } from '@/shared/api/mockDb';
import { createSeed } from '@/shared/api/seed';
import { TODAY } from '@/test/fixtures';

import {
  createTransaction,
  deleteTransaction,
  fetchTransactionsPage,
  restoreTransaction,
  type TransactionInput,
  updateTransaction,
} from './transactionsApi';

const input: TransactionInput = {
  type: 'expense',
  amount: 250_000,
  subcategoryId: 'sub-car-1',
  date: TODAY,
  comment: ' АЗС ',
  tags: ['отпуск в сочи', 'Новый тег'],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
  resetDb(createSeed(TODAY));
});

describe('createTransaction', () => {
  it('создаёт операцию от имени текущего участника и находит теги без учёта регистра', async () => {
    const tx = await createTransaction('new-1', input);
    expect(tx).toMatchObject({ authorId: 'm-alexey', comment: 'АЗС', amount: 250_000 });
    expect(tx.tagIds[0]).toBe('tag-sochi');
    expect(readDb().tags.some((t) => t.name === 'Новый тег')).toBe(true);
  });

  it('повтор с тем же id не создаёт дубликат (FR-3.4)', async () => {
    await createTransaction('new-2', input);
    await createTransaction('new-2', input);
    expect(readDb().transactions.filter((t) => t.id === 'new-2')).toHaveLength(1);
  });

  it('отклоняет дату позже завтрашнего дня и подкатегорию другого типа', async () => {
    await expect(
      createTransaction('bad-1', { ...input, date: '2026-10-19' }),
    ).rejects.toMatchObject({ code: 'validation' });
    await expect(createTransaction('bad-2', { ...input, type: 'income' })).rejects.toMatchObject({
      code: 'validation',
    });
  });

  it('ошибка сети не сохраняет операцию (ERR-2)', async () => {
    setFailMode('network');
    await expect(createTransaction('net-1', input)).rejects.toBeInstanceOf(ApiError);
    setFailMode(null);
    expect(readDb().transactions.some((t) => t.id === 'net-1')).toBe(false);
  });
});

describe('updateTransaction', () => {
  it('различает конфликт, нет прав и не найдена (FR-3.5)', async () => {
    const tx = await createTransaction('upd-1', input);
    await updateTransaction('upd-1', tx.updatedAt, { ...input, amount: 300_000 });
    await expect(updateTransaction('upd-1', tx.updatedAt, input)).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(updateTransaction('missing', 'x', input)).rejects.toMatchObject({
      code: 'not_found',
    });

    // Участник Даша (member) не может менять операцию Алексея.
    writeDb(['session'], (db) => ({ ...db, currentMemberId: 'm-dasha' }));
    const fresh = readDb().transactions.find((t) => t.id === 'upd-1');
    await expect(updateTransaction('upd-1', fresh?.updatedAt ?? '', input)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});

describe('удаление и восстановление (FR-3.6)', () => {
  it('восстанавливает операцию с прежними полями и местом в истории', async () => {
    const tx = await createTransaction('del-1', input);
    const query = {
      period: { from: TODAY, to: TODAY },
      search: '',
      filters: { type: null, categoryIds: [], subcategoryIds: [], tagIds: [], authorIds: [] },
    };
    const before = (await fetchTransactionsPage(query)).items.map((t) => t.id);
    await deleteTransaction('del-1');
    expect((await fetchTransactionsPage(query)).items.some((t) => t.id === 'del-1')).toBe(false);
    await restoreTransaction('del-1');
    const after = await fetchTransactionsPage(query);
    expect(after.items.map((t) => t.id)).toEqual(before);
    expect(after.items.find((t) => t.id === 'del-1')).toMatchObject({
      createdAt: tx.createdAt,
      tagIds: tx.tagIds,
      deletedAt: null,
    });
  });
});
