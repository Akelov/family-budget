import { Pencil } from 'lucide-react';
import { Link } from 'react-router';

import { useReference } from '@/features/household/hooks/referenceContext';
import { formatMoney } from '@/shared/lib/money';
import { Badge } from '@/shared/ui/Badge';
import { IconButton } from '@/shared/ui/IconButton';
import { ProgressBar } from '@/shared/ui/ProgressBar';

import { type BudgetView, describeBudgetItems } from '../model/budget';

export interface BudgetCardProps {
  view: BudgetView;
  href: string;
  onEdit?: (() => void) | undefined;
}

const STATUS_TEXT = { ok: 'В норме', warning: 'Почти у лимита' } as const;

/** Карточка бюджета: потрачено из лимита, процент, статус и остаток (FR-7.3, FR-7.4). */
export function BudgetCard({ view, href, onEdit }: BudgetCardProps) {
  const { lookups } = useReference();
  const { budget, spent, remaining, percent, status } = view;
  const statusText =
    status.kind === 'over' ? `Превышен на ${formatMoney(status.overBy)}` : STATUS_TEXT[status.kind];
  // min-w-0: без него элемент сетки растягивается по ширине неразрывного содержимого
  // и на 360 px карточка вылезала за экран (найдено автопроверкой скриншотов).
  return (
    <article className="relative flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">
            <Link
              to={href}
              className="after:absolute after:inset-0 after:rounded-2xl hover:text-primary"
            >
              {budget.name}
            </Link>
          </h2>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
            {describeBudgetItems(budget, lookups)}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <Badge tone={status.kind}>{statusText}</Badge>
          {onEdit && (
            <IconButton
              label={`Изменить бюджет «${budget.name}»`}
              onClick={onEdit}
              className="-my-2 -mr-2"
            >
              <Pencil />
            </IconButton>
          )}
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0">
          Потрачено <b className="num font-semibold">{formatMoney(spent)}</b>{' '}
          <span className="num text-muted-foreground">из {formatMoney(budget.amount)}</span>
        </span>
        <span className="num text-muted-foreground">{percent}%</span>
      </div>
      <ProgressBar
        percent={percent}
        tone={status.kind}
        label={`Бюджет «${budget.name}»: ${percent}%`}
      />
      <p className="text-[13px] text-muted-foreground">
        Осталось <b className="num font-semibold text-foreground">{formatMoney(remaining)}</b>
        {!view.hasActiveSubcategories && (
          <span className="ml-2 text-warning-foreground">· Нет активных подкатегорий</span>
        )}
      </p>
    </article>
  );
}
