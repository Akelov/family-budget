import { isSupabaseEnabled } from '@/shared/api/config';

import * as mock from './transactionsApi.mock';
import * as remote from './transactionsApi.supabase';

/** API операций: Supabase или мок-сервер — выбирается при запуске. */
const api = isSupabaseEnabled ? remote : mock;

export const fetchTransactionsPage = api.fetchTransactionsPage;
export const fetchSummary = api.fetchSummary;
export const fetchTransaction = api.fetchTransaction;
export const createTransaction = api.createTransaction;
export const updateTransaction = api.updateTransaction;
export const deleteTransaction = api.deleteTransaction;
export const restoreTransaction = api.restoreTransaction;

export { PAGE_SIZE, type TransactionInput, type TransactionPage } from './types';
