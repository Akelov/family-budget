import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import type { TransactionType } from '@/shared/types/domain';

export type ReportTab = 'categories' | 'tags';

/**
 * Состояние «Отчётов» в параметрах адреса: тип (`kind`), разрез (`view`) и раскрытая
 * категория (`category`). Так «Назад» возвращает с подкатегорий на категории.
 */
export function useReportParams() {
  const [params, setParams] = useSearchParams();
  const type: TransactionType = params.get('kind') === 'income' ? 'income' : 'expense';
  const tab: ReportTab = params.get('view') === 'tags' ? 'tags' : 'categories';
  const categoryId = tab === 'categories' ? params.get('category') : null;

  const update = useCallback(
    (key: 'kind' | 'view' | 'category', value: string | null) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        // Смена типа или разреза закрывает раскрытую категорию.
        if (key !== 'category') next.delete('category');
        return next;
      }),
    [setParams],
  );

  return {
    type,
    tab,
    categoryId,
    setType: (value: TransactionType) => update('kind', value === 'income' ? value : null),
    setTab: (value: ReportTab) => update('view', value === 'tags' ? value : null),
    openCategory: (id: string | null) => update('category', id),
  };
}
