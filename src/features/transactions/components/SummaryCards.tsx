import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Skeleton } from '@/shared/ui/Skeleton';

import { spentShare } from '../model/summary';
import type { Summary } from '../model/types';

export interface SummaryCardsProps {
  summary: Summary | undefined;
  isFiltered: boolean;
}

/** Сводка периода: Доход, Расход, Остаток и полоса «Потрачено N% от дохода» (FR-3.10). */
export function SummaryCards({ summary, isFiltered }: SummaryCardsProps) {
  if (!summary) {
    return (
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="status"
        aria-label="Загрузка сводки"
      >
        <Skeleton className="h-[68px] rounded-2xl" />
        <Skeleton className="h-[68px] rounded-2xl" />
        <Skeleton className="col-span-2 h-[68px] rounded-2xl sm:col-span-1" />
      </div>
    );
  }
  const share = spentShare(summary);
  const cards = [
    {
      label: 'Доход',
      value: formatMoney(summary.income, { sign: 'always' }),
      tone: 'text-primary',
    },
    {
      label: 'Расход',
      value: formatMoney(-summary.expense, { sign: 'always' }),
      tone: 'text-destructive',
    },
    {
      label: 'Остаток',
      value: formatMoney(summary.balance, { sign: 'negative' }),
      tone: summary.balance < 0 ? 'text-destructive' : 'text-foreground',
    },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {/* На телефоне суммы с копейками не помещаются в три колонки (найдено по скриншоту 390 px):
          Доход и Расход — в ряд, Остаток — на всю ширину; с 640 px — три карточки в ряд. */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className={cn(
              'min-w-0 rounded-2xl bg-card px-3 py-3 shadow-card',
              index === 2 &&
                'col-span-2 flex items-baseline justify-between gap-3 sm:col-span-1 sm:block',
            )}
          >
            <dt className="mb-1 text-xs text-muted-foreground">{card.label}</dt>
            <dd
              className={cn('num truncate text-[15px] font-semibold sm:text-base', card.tone)}
              title={card.value}
            >
              {card.value}
            </dd>
          </div>
        ))}
      </dl>
      {share !== null && (
        <div className="px-0.5">
          <ProgressBar
            percent={share}
            tone={share > 100 ? 'over' : share >= 80 ? 'warning' : 'ok'}
            label="Доля расходов от дохода"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Потрачено <b className="font-semibold text-foreground">{share}%</b> от дохода
            {isFiltered && ' · по результатам поиска и фильтров'}
          </p>
        </div>
      )}
      {share === null && isFiltered && (
        <p className="px-0.5 text-xs text-muted-foreground">По результатам поиска и фильтров</p>
      )}
    </div>
  );
}
