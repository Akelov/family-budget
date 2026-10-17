import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { useReference } from '@/features/household/hooks/referenceContext';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { Modal } from '@/shared/ui/Modal';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';

import { EMPTY_FILTERS, type TransactionFilters } from '../model/types';
import { FilterChip } from './FilterChip';

export interface FiltersDialogProps {
  initial: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
}

type TypeOption = 'all' | 'expense' | 'income';
const TYPE_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
] as const satisfies ReadonlyArray<{ value: TypeOption; label: string }>;

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Фильтры истории: тип, категории и подкатегории, теги, авторы (FR-3.12). */
export function FiltersDialog({ initial, onApply, onClose }: FiltersDialogProps) {
  const { categories, subcategories, tags, members } = useReference();
  const [draft, setDraft] = useState(initial);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const shownCategories = categories.filter((c) => draft.type === null || c.type === draft.type);

  return (
    <Modal
      title="Фильтры"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" onClick={() => setDraft(EMPTY_FILTERS)}>
            Сбросить
          </Button>
          <Button isBlock size="lg" onClick={() => onApply(draft)}>
            Показать
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <SegmentedControl
          label="Тип операций"
          options={TYPE_OPTIONS}
          value={draft.type ?? 'all'}
          onChange={(v) => setDraft({ ...draft, type: v === 'all' ? null : v })}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-medium text-muted-foreground">
            Категории и подкатегории
          </legend>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {shownCategories.map((category) => {
              const subs = subcategories.filter((s) => s.categoryId === category.id);
              const isCategoryOn = draft.categoryIds.includes(category.id);
              const pickedSubs = subs.filter((s) => draft.subcategoryIds.includes(s.id)).length;
              const isOpen = openCategory === category.id;
              return (
                <li key={category.id}>
                  <div className="flex items-center gap-2 py-1.5 pr-1.5 pl-3">
                    <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={isCategoryOn}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            categoryIds: toggle(draft.categoryIds, category.id),
                          })
                        }
                      />
                      <span className="truncate">{category.name}</span>
                      {pickedSubs > 0 && !isCategoryOn && (
                        <span className="shrink-0 text-xs text-primary">{pickedSubs}</span>
                      )}
                    </label>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`Подкатегории: ${category.name}`}
                      onClick={() => setOpenCategory(isOpen ? null : category.id)}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                    >
                      <ChevronDown
                        className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="flex flex-wrap gap-1.5 px-3 pb-3 pl-[52px]">
                      {subs.map((sub) => (
                        <FilterChip
                          key={sub.id}
                          isOn={isCategoryOn || draft.subcategoryIds.includes(sub.id)}
                          onToggle={() =>
                            setDraft({
                              ...draft,
                              subcategoryIds: toggle(draft.subcategoryIds, sub.id),
                            })
                          }
                        >
                          {sub.name}
                        </FilterChip>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
        {tags.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Теги</legend>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <FilterChip
                  key={tag.id}
                  isOn={draft.tagIds.includes(tag.id)}
                  onToggle={() => setDraft({ ...draft, tagIds: toggle(draft.tagIds, tag.id) })}
                >
                  {tag.name}
                </FilterChip>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Авторы</legend>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <FilterChip
                key={m.id}
                isOn={draft.authorIds.includes(m.id)}
                onToggle={() => setDraft({ ...draft, authorIds: toggle(draft.authorIds, m.id) })}
              >
                {m.removedAt ? `${m.displayName} (бывший участник)` : m.displayName}
              </FilterChip>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
