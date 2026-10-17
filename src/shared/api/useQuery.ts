import { useCallback, useEffect, useRef, useState } from 'react';

import { logClientError } from '@/shared/lib/logger';

import { ApiError, isRetryable } from './errors';
import { type DbTopic, subscribeDb } from './mockDb';

export type QueryState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'error'; data: T | undefined; error: unknown }
  | { status: 'success'; data: T; error: undefined };

export type QueryResult<T> = QueryState<T> & {
  /** Идёт повторная загрузка поверх уже показанных данных. */
  isRefreshing: boolean;
  refetch: () => void;
};

/** Паузы перед повторами чтения (ERR-4): 1 и 3 секунды. В тестах — без пауз. */
const RETRY_DELAYS_MS = import.meta.env.MODE === 'test' ? [0, 0] : [1000, 3000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries<T>(fetcher: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetcher();
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (!isRetryable(error) || delay === undefined) throw error;
      await wait(delay);
    }
  }
}

/**
 * Загрузка данных с тремя состояниями (правило 14) и перезапросом при изменениях.
 *
 * - `key` — строка-идентификатор запроса: при её смене данные загружаются заново;
 * - `topics` — темы изменений базы (аналог Supabase Realtime), при которых данные обновляются
 *   в фоне без скелетона;
 * - ответы устаревших запросов отбрасываются, чтобы быстрое листание периодов не показало
 *   данные не того периода.
 */
export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  topics: readonly DbTopic[],
): QueryResult<T> {
  const [state, setState] = useState<QueryState<T>>({
    status: 'loading',
    data: undefined,
    error: undefined,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);
  const topicsKey = topics.join(',');

  const run = useCallback(
    (isBackground: boolean) => {
      const id = ++requestId.current;
      if (isBackground) setIsRefreshing(true);
      else setState({ status: 'loading', data: undefined, error: undefined });
      withRetries(() => fetcherRef.current())
        .then((data) => {
          if (id === requestId.current) setState({ status: 'success', data, error: undefined });
        })
        .catch((error: unknown) => {
          if (id !== requestId.current) return;
          if (!(error instanceof ApiError)) {
            logClientError({
              screen: key.split(':')[0] ?? 'unknown',
              code: 'load_failed',
              message: String(error),
            });
          }
          // При фоновом обновлении старые данные остаются на экране (ERR-3).
          setState((prev) => ({ status: 'error', data: prev.data, error }));
        })
        .finally(() => {
          if (id === requestId.current) setIsRefreshing(false);
        });
    },
    [key],
  );

  useEffect(() => {
    run(false);
  }, [run]);

  useEffect(() => {
    const watched = new Set(topicsKey.split(','));
    return subscribeDb((changed) => {
      if (changed.some((topic) => watched.has(topic))) run(true);
    });
  }, [run, topicsKey]);

  const refetch = useCallback(() => run(false), [run]);
  return { ...state, isRefreshing, refetch };
}
