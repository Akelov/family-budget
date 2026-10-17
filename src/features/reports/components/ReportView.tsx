import { ChartPie } from 'lucide-react';

import { errorMessage } from '@/shared/api/errors';
import type { QueryResult } from '@/shared/api/useQuery';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Skeleton } from '@/shared/ui/Skeleton';

import type { Report } from '../api/reportsApi';
import type { ReportRow } from '../model/aggregate';
import { DonutChart } from './DonutChart';
import { ReportList } from './ReportList';

export interface ReportViewProps {
  query: QueryResult<Report>;
  caption: string;
  emptyText: string;
  footnote?: string;
  onSelect: (row: ReportRow) => void;
}

/** Диаграмма и список отчёта со всеми состояниями загрузки. */
export function ReportView({ query, caption, emptyText, footnote, onSelect }: ReportViewProps) {
  if (query.status === 'loading') {
    return (
      <div role="status" className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <span className="sr-only">Загрузка отчёта…</span>
        <Skeleton className="mx-auto aspect-square w-full max-w-[260px] rounded-full" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }
  if (!query.data)
    return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;
  if (query.data.rows.length === 0) return <EmptyState icon={<ChartPie />} title={emptyText} />;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl bg-card p-6 shadow-card">
        <DonutChart rows={query.data.rows} total={query.data.total} caption={caption} />
      </div>
      <div>
        <ReportList rows={query.data.rows} onSelect={onSelect} label={caption} />
        {footnote && <p className="mt-3 px-1 text-xs text-muted-foreground">{footnote}</p>}
      </div>
    </div>
  );
}
