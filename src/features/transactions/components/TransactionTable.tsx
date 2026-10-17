import { Fragment } from 'react';

import { useReference } from '@/features/household/hooks/referenceContext';
import { formatShortDate } from '@/shared/lib/dates';
import { authorName, categoryOfSubcategory } from '@/shared/lib/lookups';
import { formatMoney } from '@/shared/lib/money';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { Chip } from '@/shared/ui/Chip';
import type { Transaction } from '@/shared/types/domain';

import type { DayGroup } from '../model/group';
import { TransactionAmount } from './TransactionAmount';

export interface TransactionTableProps {
  groups: DayGroup[];
  onOpen: (transaction: Transaction) => void;
}

const TH = 'px-4 py-3 text-left text-xs font-medium text-muted-foreground';
const TD = 'border-t border-border px-4 py-2.5 align-middle';

/**
 * История на десктопе (≥ 1024 px): таблица «Дата · Категория › Подкатегория · Комментарий ·
 * Теги · Автор · Сумма» со строками-заголовками дней и итогом дня (концепция 4).
 */
export function TransactionTable({ groups, onOpen }: TransactionTableProps) {
  const { lookups } = useReference();
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[88px]" />
          <col className="w-[30%]" />
          <col />
          <col className="w-[17%]" />
          <col className="w-[110px]" />
          <col className="w-[132px]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Дата
            </th>
            <th scope="col" className={TH}>
              Категория › Подкатегория
            </th>
            <th scope="col" className={TH}>
              Комментарий
            </th>
            <th scope="col" className={TH}>
              Теги
            </th>
            <th scope="col" className={TH}>
              Автор
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Сумма
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.date}>
              <tr className="bg-background">
                <th
                  scope="colgroup"
                  colSpan={5}
                  className="border-t border-border px-4 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {group.title}
                </th>
                <td className="num border-t border-border px-4 py-2 text-right text-xs text-muted-foreground">
                  {formatMoney(group.total, { sign: 'always' })}
                </td>
              </tr>
              {group.items.map((tx) => {
                const category = categoryOfSubcategory(lookups, tx.subcategoryId);
                const sub = lookups.subcategoryById.get(tx.subcategoryId);
                return (
                  <tr
                    key={tx.id}
                    tabIndex={0}
                    onClick={() => onOpen(tx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpen(tx);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-background focus-visible:bg-accent"
                    aria-label={`${category?.name ?? ''} › ${sub?.name ?? ''}, ${formatMoney(tx.amount)}`}
                  >
                    <td className={`${TD} text-muted-foreground`}>{formatShortDate(tx.date)}</td>
                    <td className={TD}>
                      <span className="flex min-w-0 items-center gap-2.5">
                        {category && (
                          <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                        )}
                        <span className="min-w-0 truncate">
                          <span className="text-muted-foreground">{category?.name ?? '—'} ›</span>{' '}
                          <b className="font-semibold">{sub?.name ?? '—'}</b>
                        </span>
                      </span>
                    </td>
                    <td className={`${TD} truncate ${tx.comment ? '' : 'text-muted-foreground'}`}>
                      {tx.comment || '—'}
                    </td>
                    <td className={TD}>
                      <span className="flex flex-wrap gap-1">
                        {tx.tagIds.map((id) => (
                          <Chip key={id}>{lookups.tagById.get(id)?.name ?? '—'}</Chip>
                        ))}
                      </span>
                    </td>
                    <td className={`${TD} truncate`}>{authorName(lookups, tx.authorId)}</td>
                    <td className={`${TD} text-right`}>
                      <TransactionAmount transaction={tx} />
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
