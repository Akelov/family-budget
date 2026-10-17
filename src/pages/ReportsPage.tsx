import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useReference } from '@/features/household/hooks/referenceContext';
import { PeriodSwitcher } from '@/features/period/components/PeriodSwitcher';
import { usePeriod } from '@/features/period/hooks/usePeriod';
import { ReportView } from '@/features/reports/components/ReportView';
import { useReport } from '@/features/reports/hooks/useReport';
import { useReportParams } from '@/features/reports/hooks/useReportParams';
import type { ReportRow } from '@/features/reports/model/aggregate';
import { linkWithPeriod } from '@/shared/lib/periodLink';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
] as const;
const TAB_OPTIONS = [
  { value: 'categories', label: 'Категории' },
  { value: 'tags', label: 'Теги' },
] as const;
const TAGS_FOOTNOTE =
  'Операция с несколькими тегами учитывается в каждом из них, поэтому сумма по тегам может быть больше итога.';

/** Экран «Отчёты» (FR-4): категории с раскрытием до подкатегорий и вкладка «Теги». */
export default function ReportsPage() {
  const { lookups } = useReference();
  const periodState = usePeriod('personal');
  const { period } = periodState;
  const { type, tab, categoryId, setType, setTab, openCategory } = useReportParams();
  const navigate = useNavigate();
  const category = categoryId ? lookups.categoryById.get(categoryId) : undefined;
  const report = useReport(period, type, tab, categoryId);

  // Последний уровень ведёт в «Операции» с фильтром и тем же периодом (FR-4.4, FR-4.6).
  function select(row: ReportRow) {
    if (tab === 'tags') navigate(linkWithPeriod('/', period, { tag: row.id, type }));
    else if (categoryId) navigate(linkWithPeriod('/', period, { sub: row.id }));
    else openCategory(row.id);
  }

  return (
    <>
      <PageHeader title="Отчёты" />
      <div className="mb-5 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(320px,380px)_1fr] lg:items-start lg:gap-6">
        <PeriodSwitcher state={periodState} />
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <SegmentedControl
            label="Тип операций"
            options={TYPE_OPTIONS}
            value={type}
            onChange={setType}
            isAccent
            className="sm:w-60"
          />
          <SegmentedControl
            label="Разрез отчёта"
            options={TAB_OPTIONS}
            value={tab}
            onChange={setTab}
            className="sm:w-60"
          />
        </div>
      </div>
      {category && (
        <button
          type="button"
          onClick={() => openCategory(null)}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
        >
          <ArrowLeft className="size-4" aria-hidden /> Все категории
        </button>
      )}
      <ReportView
        query={report}
        caption={category?.name ?? (type === 'expense' ? 'Расходы' : 'Доходы')}
        emptyText={
          tab === 'tags'
            ? 'Нет операций с тегами за этот период'
            : `За этот период ${type === 'expense' ? 'расходов' : 'доходов'} нет`
        }
        {...(tab === 'tags' ? { footnote: TAGS_FOOTNOTE } : {})}
        onSelect={select}
      />
    </>
  );
}
