import { Plus, Target } from 'lucide-react';
import { useState } from 'react';

import { fetchBudgetStatuses } from '@/features/budgets/api/budgetsApi';
import { BudgetCard } from '@/features/budgets/components/BudgetCard';
import { BudgetForm } from '@/features/budgets/components/BudgetForm';
import type { BudgetView } from '@/features/budgets/model/budget';
import { useReference } from '@/features/household/hooks/referenceContext';
import { PeriodSwitcher } from '@/features/period/components/PeriodSwitcher';
import { usePeriod } from '@/features/period/hooks/usePeriod';
import { formatPeriodLabel } from '@/features/period/model/period';
import { errorMessage } from '@/shared/api/errors';
import { useQuery } from '@/shared/api/useQuery';
import { linkWithPeriod } from '@/shared/lib/periodLink';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { PageHeader } from '@/shared/ui/PageHeader';
import type { Budget, Period } from '@/shared/types/domain';

type FormState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; budget: Budget };

/** Ссылка на операции бюджета: его категории и подкатегории за период семьи (FR-7.6). */
function budgetLink(view: BudgetView, period: Period): string {
  const cats = view.budget.items.flatMap((i) => (i.kind === 'category' ? [i.categoryId] : []));
  const subs = view.budget.items.flatMap((i) =>
    i.kind === 'subcategory' ? [i.subcategoryId] : [],
  );
  return linkWithPeriod('/', period, { type: 'expense', cat: cats.join(','), sub: subs.join(',') });
}

/** Экран «План» — бюджеты по периоду семьи (FR-7, FR-5.8). */
export default function PlanPage() {
  const { can } = useReference();
  const periodState = usePeriod('family');
  const { period } = periodState;
  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const budgets = useQuery(`plan:${period.from}:${period.to}`, () => fetchBudgetStatuses(period), [
    'budgets',
    'transactions',
    'categories',
  ]);
  const canManage = can('budgets.manage');
  const createButton = canManage ? (
    <Button size="sm" icon={<Plus />} onClick={() => setForm({ kind: 'create' })}>
      Бюджет
    </Button>
  ) : undefined;

  function renderContent() {
    if (budgets.status === 'loading') return <LoadingState rows={3} label="Загрузка бюджетов…" />;
    if (!budgets.data)
      return <ErrorState message={errorMessage(budgets.error)} onRetry={budgets.refetch} />;
    if (budgets.data.length === 0) {
      return (
        <EmptyState
          icon={<Target />}
          title="Бюджетов пока нет"
          description="Задайте лимит на группу трат и следите за остатком"
          action={createButton}
        />
      );
    }
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {budgets.data.map((view) => (
          <BudgetCard
            key={view.budget.id}
            view={view}
            href={budgetLink(view, period)}
            onEdit={canManage ? () => setForm({ kind: 'edit', budget: view.budget }) : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="План" actions={createButton} />
      <div className="mb-4 flex flex-col gap-2 lg:max-w-[380px]">
        <PeriodSwitcher state={periodState} hasModeSwitch={false} />
        <p className="px-1 text-[13px] text-muted-foreground">
          Бюджеты считаются по периоду семьи: {formatPeriodLabel(period)}
        </p>
      </div>
      {renderContent()}
      {form.kind !== 'closed' && (
        <BudgetForm
          budget={form.kind === 'edit' ? form.budget : undefined}
          onClose={() => setForm({ kind: 'closed' })}
        />
      )}
    </>
  );
}
