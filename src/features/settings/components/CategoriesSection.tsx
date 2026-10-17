import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';

import { useReference } from '@/features/household/hooks/referenceContext';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import type { Category, TransactionType } from '@/shared/types/domain';

import { CategoryEditor } from './CategoryEditor';
import { NewCategoryDialog } from './NewCategoryDialog';
import { SettingsCard } from './SettingsCard';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
] as const;

/** Категории и подкатегории семьи (FR-2): изменение — владелец и администратор. */
export function CategoriesSection() {
  const { categories, subcategories, can } = useReference();
  const [type, setType] = useState<TransactionType>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const canManage = can('categories.manage');
  const list = categories
    .filter((c) => c.type === type)
    .sort((a, b) => Number(a.archivedAt !== null) - Number(b.archivedAt !== null));

  return (
    <SettingsCard
      title="Категории"
      description={
        canManage
          ? 'Нажмите на категорию, чтобы изменить её'
          : 'Изменять может владелец или администратор'
      }
      actions={
        canManage ? (
          <Button size="sm" icon={<Plus />} onClick={() => setIsCreating(true)}>
            Категория
          </Button>
        ) : undefined
      }
    >
      <SegmentedControl
        label="Тип категорий"
        options={TYPE_OPTIONS}
        value={type}
        onChange={setType}
        isAccent
        className="mb-3 sm:max-w-xs"
      />
      <ul className="divide-y divide-border">
        {list.map((category) => {
          const subs = subcategories.filter(
            (s) => s.categoryId === category.id && s.archivedAt === null,
          );
          const content = (
            <>
              <CategoryIcon icon={category.icon} color={category.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{category.name}</span>
                <span className="block truncate text-[13px] text-muted-foreground">
                  {subs.map((s) => s.name).join(', ') || '—'}
                </span>
              </span>
              {category.archivedAt && <Badge tone="neutral">в архиве</Badge>}
            </>
          );
          return (
            <li key={category.id} className={category.archivedAt ? 'opacity-70' : undefined}>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-background"
                >
                  {content}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {editing && <CategoryEditor category={editing} onClose={() => setEditing(null)} />}
      {isCreating && <NewCategoryDialog type={type} onClose={() => setIsCreating(false)} />}
    </SettingsCard>
  );
}
