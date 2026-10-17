import { Plus, SearchX, Wallet } from 'lucide-react';
import { useMemo } from 'react';

import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';

import { useTransactionForm } from '../hooks/transactionFormContext';
import { useTransactions } from '../hooks/useTransactions';
import { groupByDay } from '../model/group';
import type { TransactionQuery } from '../model/types';
import { LoadMore } from './LoadMore';
import { StaleBanner } from './StaleBanner';
import { TransactionList } from './TransactionList';
import { TransactionTable } from './TransactionTable';

export interface TransactionHistoryProps {
  query: TransactionQuery;
  isFiltered: boolean;
  onReset: () => void;
}

/** История операций со всеми состояниями: загрузка, ошибка, пусто, данные (правило 14). */
export function TransactionHistory({ query, isFiltered, onReset }: TransactionHistoryProps) {
  const history = useTransactions(query);
  const form = useTransactionForm();
  const groups = useMemo(() => groupByDay(history.items), [history.items]);

  if (history.status === 'loading') return <LoadingState label="Загрузка операций…" />;
  if (history.status === 'error' && !history.data) {
    return <ErrorState message={errorMessage(history.error)} onRetry={history.refetch} />;
  }
  if (groups.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={<SearchX />}
        title="Ничего не найдено"
        description="Измените запрос или фильтры"
        action={
          <Button variant="secondary" size="sm" onClick={onReset}>
            Сбросить
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={<Wallet />}
        title="В этом периоде пока нет операций"
        action={
          <Button size="sm" icon={<Plus />} onClick={() => form.openCreate()}>
            Добавить операцию
          </Button>
        }
      />
    );
  }
  return (
    <div>
      {history.status === 'error' && <StaleBanner onRetry={history.refetch} />}
      <div className="lg:hidden">
        <TransactionList groups={groups} onOpen={form.openEdit} />
      </div>
      <div className="hidden lg:block">
        <TransactionTable groups={groups} onOpen={form.openEdit} />
      </div>
      {history.hasMore && (
        <LoadMore
          isLoading={history.isLoadingMore}
          hasError={history.loadMoreError !== null}
          onLoadMore={history.loadMore}
        />
      )}
    </div>
  );
}
