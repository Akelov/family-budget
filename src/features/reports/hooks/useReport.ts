import { useQuery } from '@/shared/api/useQuery';
import type { Period, TransactionType } from '@/shared/types/domain';

import { fetchCategoryReport, fetchSubcategoryReport, fetchTagReport } from '../api/reportsApi';
import type { ReportTab } from './useReportParams';

const TOPICS = ['transactions', 'categories', 'tags'] as const;

/** Загружает нужный уровень отчёта: категории, подкатегории одной категории или теги. */
export function useReport(
  period: Period,
  type: TransactionType,
  tab: ReportTab,
  categoryId: string | null,
) {
  return useQuery(
    `reports:${period.from}:${period.to}:${type}:${tab}:${categoryId ?? ''}`,
    () => {
      if (tab === 'tags') return fetchTagReport(period, type);
      if (categoryId) return fetchSubcategoryReport(period, categoryId);
      return fetchCategoryReport(period, type);
    },
    TOPICS,
  );
}
