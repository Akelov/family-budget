import { Check, ChevronDown, Minus } from 'lucide-react';
import { useState } from 'react';

import { useReference } from '@/features/household/hooks/referenceContext';
import { cn } from '@/shared/lib/cn';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import type { BudgetItem } from '@/shared/types/domain';

export interface BudgetItemsTreeProps {
  items: BudgetItem[];
  onChange: (items: BudgetItem[]) => void;
  hasError: boolean;
}

type CheckState = 'on' | 'partial' | 'off';

function CheckMark({ state }: { state: CheckState }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-md border-2',
        state === 'off' ? 'border-border bg-white' : 'border-primary bg-primary text-white',
      )}
    >
      {state === 'on' && <Check className="size-3.5" strokeWidth={3} />}
      {state === 'partial' && <Minus className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

/**
 * Выбор состава бюджета (FR-7.2): категория целиком (включая будущие подкатегории)
 * или отдельные подкатегории. Только расходные категории.
 */
export function BudgetItemsTree({ items, onChange, hasError }: BudgetItemsTreeProps) {
  const { categories, subcategories } = useReference();
  const [open, setOpen] = useState<string | null>(null);
  const expense = categories.filter((c) => c.type === 'expense' && c.archivedAt === null);
  const wholeIds = new Set(items.flatMap((i) => (i.kind === 'category' ? [i.categoryId] : [])));
  const subIds = new Set(items.flatMap((i) => (i.kind === 'subcategory' ? [i.subcategoryId] : [])));

  function toggleCategory(categoryId: string) {
    const withoutCategory = items.filter((i) => {
      if (i.kind === 'category') return i.categoryId !== categoryId;
      return subcategories.find((s) => s.id === i.subcategoryId)?.categoryId !== categoryId;
    });
    onChange(
      wholeIds.has(categoryId)
        ? withoutCategory
        : [...withoutCategory, { kind: 'category', categoryId }],
    );
  }

  function toggleSub(categoryId: string, subcategoryId: string) {
    if (wholeIds.has(categoryId)) {
      // Снятие одной подкатегории из «целой категории» превращает её в набор остальных подкатегорий.
      const rest = subcategories.filter(
        (s) => s.categoryId === categoryId && s.archivedAt === null && s.id !== subcategoryId,
      );
      onChange([
        ...items.filter((i) => !(i.kind === 'category' && i.categoryId === categoryId)),
        ...rest.map((s) => ({ kind: 'subcategory' as const, subcategoryId: s.id })),
      ]);
      return;
    }
    onChange(
      subIds.has(subcategoryId)
        ? items.filter((i) => !(i.kind === 'subcategory' && i.subcategoryId === subcategoryId))
        : [...items, { kind: 'subcategory', subcategoryId }],
    );
  }

  return (
    <ul
      className={cn(
        'divide-y divide-border rounded-2xl border',
        hasError ? 'border-destructive' : 'border-border',
      )}
    >
      {expense.map((category) => {
        const subs = subcategories.filter(
          (s) => s.categoryId === category.id && s.archivedAt === null,
        );
        const picked = subs.filter((s) => subIds.has(s.id)).length;
        const state: CheckState = wholeIds.has(category.id) ? 'on' : picked > 0 ? 'partial' : 'off';
        const isOpen = open === category.id;
        return (
          <li key={category.id}>
            <div className="flex items-center gap-2 py-1 pr-1.5 pl-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={state === 'on' ? true : state === 'partial' ? 'mixed' : false}
                onClick={() => toggleCategory(category.id)}
                className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left text-sm font-medium"
              >
                <CheckMark state={state} />
                <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                <span className="truncate">{category.name}</span>
                {state === 'on' && (
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">
                    вся категория
                  </span>
                )}
                {state === 'partial' && (
                  <span className="shrink-0 text-xs font-normal text-primary">
                    {picked} из {subs.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`Подкатегории: ${category.name}`}
                onClick={() => setOpen(isOpen ? null : category.id)}
                className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <ChevronDown
                  className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
                />
              </button>
            </div>
            {isOpen && (
              <ul className="pb-2">
                {subs.map((sub) => {
                  const isOn = wholeIds.has(category.id) || subIds.has(sub.id);
                  return (
                    <li key={sub.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isOn}
                        onClick={() => toggleSub(category.id, sub.id)}
                        className="flex w-full items-center gap-3 py-2 pr-3 pl-14 text-left text-sm hover:bg-background"
                      >
                        <CheckMark state={isOn ? 'on' : 'off'} />
                        <span className="truncate">{sub.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
