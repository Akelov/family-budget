import { useCallback, useEffect, useState } from 'react';

import { useQuery } from '@/shared/api/useQuery';
import type { Transaction } from '@/shared/types/domain';

import { fetchSummary, fetchTransactionsPage } from '../api/transactionsApi';
import type { TransactionQuery } from '../model/types';

const TOPICS = ['transactions', 'tags', 'categories', 'session'] as const;

interface ExtraPages {
  base: unknown;
  items: Transaction[];
  nextCursor: number | null;
}

/**
 * История операций с подгрузкой порциями по 50 (FR-3.8). При изменении данных (Realtime)
 * перезапрашивается первая порция, а подгруженные дальше сбрасываются (FR-3.13).
 */
export function useTransactions(query: TransactionQuery) {
  const key = `operations:${JSON.stringify(query)}`;
  const first = useQuery(key, () => fetchTransactionsPage(query, 0), TOPICS);
  const [extra, setExtra] = useState<ExtraPages | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<unknown>(null);

  useEffect(() => {
    setExtra(null);
    setLoadMoreError(null);
  }, [first.data]);

  const items = first.data
    ? [...first.data.items, ...(extra?.base === first.data ? extra.items : [])]
    : [];
  const nextCursor =
    extra?.base === first.data && extra ? extra.nextCursor : (first.data?.nextCursor ?? null);

  const loadMore = useCallback(() => {
    if (nextCursor === null || isLoadingMore || !first.data) return;
    const base = first.data;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    fetchTransactionsPage(query, nextCursor)
      .then((page) =>
        setExtra((prev) => ({
          base,
          items: [...(prev?.base === base ? prev.items : []), ...page.items],
          nextCursor: page.nextCursor,
        })),
      )
      .catch((error: unknown) => setLoadMoreError(error))
      .finally(() => setIsLoadingMore(false));
  }, [first.data, isLoadingMore, nextCursor, query]);

  return { ...first, items, hasMore: nextCursor !== null, isLoadingMore, loadMoreError, loadMore };
}

/** Сводка периода (`period_summary`). */
export function useSummary(query: TransactionQuery) {
  return useQuery(`summary:${JSON.stringify(query)}`, () => fetchSummary(query), TOPICS);
}
