import { useReference } from '@/features/household/hooks/referenceContext';
import { authorName, categoryOfSubcategory } from '@/shared/lib/lookups';
import { formatMoney } from '@/shared/lib/money';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { Chip } from '@/shared/ui/Chip';
import type { Transaction } from '@/shared/types/domain';

import type { DayGroup } from '../model/group';
import { TransactionAmount } from './TransactionAmount';

export interface TransactionListProps {
  groups: DayGroup[];
  onOpen: (transaction: Transaction) => void;
}

/** История на телефоне и планшете: карточки по дням с итогом дня (концепция 4). */
export function TransactionList({ groups, onOpen }: TransactionListProps) {
  const { lookups } = useReference();
  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => (
        <section key={group.date} aria-label={group.title}>
          <h3 className="mx-1 mt-4 mb-2 flex justify-between gap-2 text-[13px] text-muted-foreground">
            <span className="truncate">{group.title}</span>
            <span className="num">{formatMoney(group.total, { sign: 'always' })}</span>
          </h3>
          <ul className="overflow-hidden rounded-2xl bg-card shadow-card">
            {group.items.map((tx) => {
              const category = categoryOfSubcategory(lookups, tx.subcategoryId);
              const sub = lookups.subcategoryById.get(tx.subcategoryId);
              const details = [tx.comment, authorName(lookups, tx.authorId)]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={tx.id} className="border-t border-border first:border-t-0">
                  <button
                    type="button"
                    onClick={() => onOpen(tx)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background"
                  >
                    {category && <CategoryIcon icon={category.icon} color={category.color} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {category?.name ?? '—'}
                        <span className="mx-1 text-muted-foreground">›</span>
                        {sub?.name ?? '—'}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                        {details}
                      </span>
                      {tx.tagIds.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {tx.tagIds.map((id) => (
                            <Chip key={id}>{lookups.tagById.get(id)?.name ?? '—'}</Chip>
                          ))}
                        </span>
                      )}
                    </span>
                    <TransactionAmount transaction={tx} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
