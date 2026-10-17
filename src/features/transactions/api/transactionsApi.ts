import { canEditTransaction } from '@/features/household/model/permissions';
import { ApiError } from '@/shared/api/errors';
import { currentMember, type DbState, nowIso, readDb, request, writeDb } from '@/shared/api/mockDb';
import { addDays, isIsoDate, todayIso } from '@/shared/lib/dates';
import { createId } from '@/shared/lib/id';
import { buildLookups, categoryOfSubcategory } from '@/shared/lib/lookups';
import { MAX_AMOUNT_KOPECKS } from '@/shared/lib/money';
import { normalizeName } from '@/shared/lib/text';
import type { Tag, Transaction, TransactionType } from '@/shared/types/domain';

import { filterTransactions } from '../model/filter';
import { summarize } from '../model/summary';
import type { Summary, TransactionQuery } from '../model/types';
import { MAX_TAGS_PER_TRANSACTION } from '../model/validation';

export const PAGE_SIZE = 50;

export interface TransactionPage {
  items: Transaction[];
  /** Курсор следующей порции или `null`, если загружено всё (FR-3.8). */
  nextCursor: number | null;
}

/** `list_transactions`: порция истории по 50 операций. */
export function fetchTransactionsPage(
  query: TransactionQuery,
  cursor = 0,
): Promise<TransactionPage> {
  return request(() => {
    const db = readDb();
    const all = filterTransactions(db.transactions, query, buildLookups(db));
    const items = all.slice(cursor, cursor + PAGE_SIZE);
    return { items, nextCursor: cursor + PAGE_SIZE < all.length ? cursor + PAGE_SIZE : null };
  });
}

/** `period_summary`: сводка по всем операциям периода с учётом поиска и фильтров (FR-3.10). */
export function fetchSummary(query: TransactionQuery): Promise<Summary> {
  return request(() => {
    const db = readDb();
    return summarize(filterTransactions(db.transactions, query, buildLookups(db)));
  });
}

/** Одна операция — для обновления формы после конфликта (ERR-8). */
export function fetchTransaction(id: string): Promise<Transaction> {
  return request(() => {
    const tx = readDb().transactions.find((t) => t.id === id && t.deletedAt === null);
    if (!tx) throw new ApiError('not_found');
    return tx;
  });
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  subcategoryId: string;
  date: string;
  comment: string;
  /** Названия тегов; новые создаются автоматически (FR-6.1). */
  tags: string[];
}

/** Серверная проверка — дублирует клиентскую, как CHECK-ограничения и триггеры БД (§3.1). */
function assertValidInput(db: DbState, input: TransactionInput): void {
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > MAX_AMOUNT_KOPECKS
  ) {
    throw new ApiError('validation', 'Введите сумму больше 0 с точностью до копеек');
  }
  if (!isIsoDate(input.date) || input.date > addDays(todayIso(), 1)) {
    throw new ApiError('validation', 'Дата не может быть в будущем');
  }
  const category = categoryOfSubcategory(buildLookups(db), input.subcategoryId);
  if (!category || category.type !== input.type)
    throw new ApiError('validation', 'Выберите подкатегорию');
  if (input.comment.length > 500)
    throw new ApiError('validation', 'Комментарий — не длиннее 500 символов');
  if (input.tags.length > MAX_TAGS_PER_TRANSACTION)
    throw new ApiError('validation', 'Не более 10 тегов на операцию');
}

/** Находит теги по названию без учёта регистра или создаёт новые (FR-6.2). */
function resolveTags(
  existing: readonly Tag[],
  names: readonly string[],
): { tagIds: string[]; created: Tag[] } {
  const created: Tag[] = [];
  const tagIds = names.map((name) => {
    const found = [...existing, ...created].find(
      (t) => normalizeName(t.name) === normalizeName(name),
    );
    if (found) return found.id;
    const tag = { id: createId(), name: name.trim() };
    created.push(tag);
    return tag.id;
  });
  return { tagIds: [...new Set(tagIds)], created };
}

/**
 * Создание операции. `id` генерирует клиент (FR-3.4): повтор с тем же `id` возвращает уже
 * созданную операцию, а не дубликат. Автор — текущий участник, его задаёт «сервер».
 */
export function createTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  return request(() => {
    const db = readDb();
    const existing = db.transactions.find((tx) => tx.id === id);
    if (existing) return existing;
    assertValidInput(db, input);
    const { tagIds, created } = resolveTags(db.tags, input.tags);
    const stamp = nowIso();
    const tx: Transaction = {
      id,
      type: input.type,
      amount: input.amount,
      subcategoryId: input.subcategoryId,
      date: input.date,
      comment: input.comment.trim(),
      tagIds,
      authorId: currentMember(db).id,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
    };
    writeDb(['transactions', 'tags'], (d) => ({
      ...d,
      tags: [...d.tags, ...created],
      transactions: [...d.transactions, tx],
    }));
    return tx;
  });
}

function findEditable(db: DbState, id: string): Transaction {
  const tx = db.transactions.find((t) => t.id === id);
  if (!tx || tx.deletedAt !== null) throw new ApiError('not_found');
  const me = currentMember(db);
  if (!canEditTransaction(me.role, me.id, tx.authorId)) throw new ApiError('forbidden');
  return tx;
}

/**
 * `update_transaction`: изменение с проверкой `updated_at` (FR-3.5). Коды ошибок различают
 * «нет прав» (`forbidden`), «конфликт» (`conflict`) и «не найдена» (`not_found`). Автор не меняется.
 */
export function updateTransaction(
  id: string,
  expectedUpdatedAt: string,
  input: TransactionInput,
): Promise<Transaction> {
  return request(() => {
    const db = readDb();
    const tx = findEditable(db, id);
    if (tx.updatedAt !== expectedUpdatedAt) throw new ApiError('conflict');
    assertValidInput(db, input);
    const { tagIds, created } = resolveTags(db.tags, input.tags);
    const updated: Transaction = {
      ...tx,
      ...input,
      comment: input.comment.trim(),
      tagIds,
      updatedAt: nowIso(),
    };
    writeDb(['transactions', 'tags'], (d) => ({
      ...d,
      tags: [...d.tags, ...created],
      transactions: d.transactions.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  });
}

/** Мягкое удаление (FR-3.6). */
export function deleteTransaction(id: string): Promise<void> {
  return request(() => {
    const db = readDb();
    findEditable(db, id);
    const deletedAt = nowIso();
    writeDb(['transactions'], (d) => ({
      ...d,
      transactions: d.transactions.map((t) => (t.id === id ? { ...t, deletedAt } : t)),
    }));
  });
}

/** Восстановление со всеми полями, тегами, автором и местом в истории (FR-3.6). */
export function restoreTransaction(id: string): Promise<void> {
  return request(() => {
    const db = readDb();
    const tx = db.transactions.find((t) => t.id === id);
    if (!tx) throw new ApiError('not_found');
    const me = currentMember(db);
    if (!canEditTransaction(me.role, me.id, tx.authorId)) throw new ApiError('forbidden');
    writeDb(['transactions'], (d) => ({
      ...d,
      transactions: d.transactions.map((t) => (t.id === id ? { ...t, deletedAt: null } : t)),
    }));
  });
}
