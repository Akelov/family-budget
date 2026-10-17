import { ApiError } from '@/shared/api/errors';
import { emitChange } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';
import { check, unwrap } from '@/shared/api/supabaseErrors';
import { num, rpcRows, str, strArray } from '@/shared/api/supabaseRpc';
import { rublesStringToKopecks } from '@/shared/lib/money';
import type { Transaction } from '@/shared/types/domain';

import type { Summary, TransactionQuery } from '../model/types';
import { PAGE_SIZE, type TransactionInput, type TransactionPage } from './types';

/** Параметры фильтров для функций `list_transactions` и `period_summary`; пустые — null. */
function filterArgs(query: TransactionQuery) {
  const list = (ids: string[]) => (ids.length > 0 ? ids : null);
  return {
    p_from: query.period.from,
    p_to: query.period.to,
    p_search: query.search || null,
    p_type: query.filters.type,
    p_category_ids: list(query.filters.categoryIds),
    p_subcategory_ids: list(query.filters.subcategoryIds),
    p_tag_ids: list(query.filters.tagIds),
    p_author_ids: list(query.filters.authorIds),
  };
}

/** `list_transactions`: порция истории. Просим на одну больше, чтобы знать, есть ли продолжение. */
export async function fetchTransactionsPage(
  query: TransactionQuery,
  cursor = 0,
): Promise<TransactionPage> {
  const rows = await rpcRows('list_transactions', {
    ...filterArgs(query),
    p_offset: cursor,
    p_limit: PAGE_SIZE + 1,
  });
  const items: Transaction[] = rows.slice(0, PAGE_SIZE).map((row) => ({
    id: str(row, 'id'),
    type: str(row, 'type') === 'income' ? 'income' : 'expense',
    amount: num(row, 'amount'),
    subcategoryId: str(row, 'subcategory_id'),
    date: str(row, 'date'),
    comment: str(row, 'comment'),
    tagIds: strArray(row, 'tag_ids'),
    authorId: str(row, 'author_id'),
    createdAt: str(row, 'created_at'),
    updatedAt: str(row, 'updated_at'),
    deletedAt: null,
  }));
  return {
    items,
    nextCursor: rows.length > PAGE_SIZE ? cursor + PAGE_SIZE : null,
  };
}

/** `period_summary`: итоги по всем операциям периода с учётом поиска и фильтров. */
export async function fetchSummary(query: TransactionQuery): Promise<Summary> {
  const row = (await rpcRows('period_summary', filterArgs(query)))[0];
  if (!row) return { income: 0, expense: 0, balance: 0 };
  return { income: num(row, 'income'), expense: num(row, 'expense'), balance: num(row, 'balance') };
}

interface TransactionTableRow {
  id: string;
  type: Transaction['type'];
  amount: string;
  subcategory_id: string;
  date: string;
  comment: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  transaction_tags: Array<{ tag_id: string }>;
}

/** Одна операция — для обновления формы после конфликта (ERR-8). */
export async function fetchTransaction(id: string): Promise<Transaction> {
  const row = unwrap(
    await supabase()
      .from('transactions')
      .select(
        'id, type, amount::text, subcategory_id, date, comment, author_id, created_at, updated_at, deleted_at, transaction_tags(tag_id)',
      )
      .eq('id', id)
      .overrideTypes<TransactionTableRow[], { merge: false }>(),
  )[0];
  if (!row || row.deleted_at) throw new ApiError('not_found');
  return {
    id: row.id,
    type: row.type,
    amount: rublesStringToKopecks(row.amount),
    subcategoryId: row.subcategory_id,
    date: row.date,
    comment: row.comment,
    tagIds: row.transaction_tags.map((t) => t.tag_id),
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function writeArgs(input: TransactionInput) {
  return {
    p_type: input.type,
    p_amount: input.amount,
    p_subcategory_id: input.subcategoryId,
    p_date: input.date,
    p_comment: input.comment,
    p_tags: input.tags,
  };
}

/** `create_transaction`: id создаёт клиент, повтор с тем же id не создаёт дубликат (FR-3.4). */
export async function createTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  check(await supabase().rpc('create_transaction', { p_id: id, ...writeArgs(input) }));
  emitChange(['transactions', 'tags', 'budgets']);
  return fetchTransaction(id);
}

/** `update_transaction` с проверкой версии: коды forbidden / conflict / not_found (FR-3.5). */
export async function updateTransaction(
  id: string,
  expectedUpdatedAt: string,
  input: TransactionInput,
): Promise<Transaction> {
  check(
    await supabase().rpc('update_transaction', {
      p_id: id,
      p_expected_updated_at: expectedUpdatedAt,
      ...writeArgs(input),
    }),
  );
  emitChange(['transactions', 'tags', 'budgets']);
  return fetchTransaction(id);
}

export async function deleteTransaction(id: string): Promise<void> {
  check(await supabase().rpc('delete_transaction', { p_id: id }));
  emitChange(['transactions', 'budgets']);
}

export async function restoreTransaction(id: string): Promise<void> {
  check(await supabase().rpc('restore_transaction', { p_id: id }));
  emitChange(['transactions', 'budgets']);
}
