import { ChevronRight } from 'lucide-react';

import { formatMoney } from '@/shared/lib/money';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { CATEGORY_BG } from '@/shared/ui/categoryPalette';
import { cn } from '@/shared/lib/cn';

import type { ReportRow } from '../model/aggregate';

export interface ReportListProps {
  rows: ReportRow[];
  onSelect: (row: ReportRow) => void;
  label: string;
}

/** Список «название — сумма — доля %» по убыванию суммы (FR-4.2). */
export function ReportList({ rows, onSelect, label }: ReportListProps) {
  return (
    <ul aria-label={label} className="overflow-hidden rounded-2xl bg-card shadow-card">
      {rows.map((row) => (
        <li key={row.id} className="border-t border-border first:border-t-0">
          <button
            type="button"
            onClick={() => onSelect(row)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background"
          >
            {row.icon ? (
              <CategoryIcon icon={row.icon} color={row.color} size="sm" />
            ) : (
              <span
                className={cn('ml-1 size-3 shrink-0 rounded-full', CATEGORY_BG[row.color])}
                aria-hidden
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {row.name}
                {row.isArchived && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">· в архиве</span>
                )}
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className={cn('block h-full rounded-full', CATEGORY_BG[row.color])}
                  style={{ width: `${row.percent}%` }}
                />
              </span>
            </span>
            <span className="num w-[86px] shrink-0 text-right font-semibold">
              {formatMoney(row.amount)}
            </span>
            <span className="num w-9 shrink-0 text-right text-sm text-muted-foreground">
              {row.percent}%
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
