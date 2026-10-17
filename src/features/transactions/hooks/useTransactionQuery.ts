import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { Period } from '@/shared/types/domain';

import { filtersFromParams, writeFiltersToParams } from '../model/params';
import type { TransactionFilters, TransactionQuery } from '../model/types';

const FILTER_KEYS = ['type', 'cat', 'sub', 'tag', 'author'] as const;

/**
 * Поиск и фильтры «Операций» из параметров адреса (FR-3.7, FR-3.14): так работают ссылки
 * из отчётов и бюджетов и кнопка «Назад».
 */
export function useTransactionQuery(period: Period) {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  // Строка только с параметрами фильтров — стабильный ключ: объект фильтров не пересоздаётся,
  // когда меняются период или поиск, и запрос истории не повторяется зря.
  const filterParams = FILTER_KEYS.flatMap((k) =>
    params.has(k) ? [`${k}=${params.get(k) ?? ''}`] : [],
  ).join('&');
  const filters = useMemo(
    () => filtersFromParams(new URLSearchParams(filterParams)),
    [filterParams],
  );

  const query = useMemo<TransactionQuery>(
    () => ({ period: { from: period.from, to: period.to }, search: search.trim(), filters }),
    [period.from, period.to, search, filters],
  );

  const setSearch = useCallback(
    (value: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set('q', value);
          else next.delete('q');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const setFilters = useCallback(
    (next: TransactionFilters) => setParams((prev) => writeFiltersToParams(prev, next)),
    [setParams],
  );

  const resetAll = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        ['q', ...FILTER_KEYS].forEach((k) => next.delete(k));
        return next;
      }),
    [setParams],
  );

  return { query, search, filters, setSearch, setFilters, resetAll };
}
