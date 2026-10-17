import { FamilyTitle } from '@/features/household/components/FamilyTitle';
import { useReference } from '@/features/household/hooks/referenceContext';
import { PeriodSwitcher } from '@/features/period/components/PeriodSwitcher';
import { usePeriod } from '@/features/period/hooks/usePeriod';
import { OperationsToolbar } from '@/features/transactions/components/OperationsToolbar';
import { SummaryCards } from '@/features/transactions/components/SummaryCards';
import { TransactionHistory } from '@/features/transactions/components/TransactionHistory';
import { useSummary } from '@/features/transactions/hooks/useTransactions';
import { useTransactionQuery } from '@/features/transactions/hooks/useTransactionQuery';
import { countActiveFilters } from '@/features/transactions/model/filter';
import { PageHeader } from '@/shared/ui/PageHeader';

/** Экран «Операции» (FR-3.7): период, сводка, поиск, фильтры и история. */
export default function OperationsPage() {
  const { household } = useReference();
  const periodState = usePeriod('personal');
  const { query, search, filters, setSearch, setFilters, resetAll } = useTransactionQuery(
    periodState.period,
  );
  const summary = useSummary(query);
  const isFiltered = query.search !== '' || countActiveFilters(filters) > 0;

  return (
    <>
      <PageHeader eyebrow={<FamilyTitle name={household.name} />} title="Операции" />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(320px,380px)_1fr] lg:items-start lg:gap-6">
        <PeriodSwitcher state={periodState} />
        <SummaryCards summary={summary.data} isFiltered={isFiltered} />
      </div>
      <div className="mt-4 flex flex-col gap-1 lg:gap-4">
        <OperationsToolbar
          search={search}
          filters={filters}
          onSearch={setSearch}
          onFilters={setFilters}
        />
        <TransactionHistory query={query} isFiltered={isFiltered} onReset={resetAll} />
      </div>
    </>
  );
}
