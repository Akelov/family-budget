import { cn } from '@/shared/lib/cn';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import type { Category } from '@/shared/types/domain';

export interface CategoryPickerProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string) => void;
  isDisabled?: boolean;
}

/** Сетка категорий с иконками (выбор категории перед подкатегорией). */
export function CategoryPicker({
  categories,
  value,
  onChange,
  isDisabled = false,
}: CategoryPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Категория"
      className="grid grid-cols-4 gap-1.5 sm:grid-cols-5"
    >
      {categories.map((category) => {
        const isOn = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            disabled={isDisabled}
            onClick={() => onChange(category.id)}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-xs font-medium transition-colors disabled:cursor-default',
              isOn ? 'bg-accent text-accent-foreground ring-2 ring-primary' : 'hover:bg-muted',
            )}
          >
            <CategoryIcon icon={category.icon} color={category.color} size="sm" />
            <span className="w-full truncate text-center">{category.name}</span>
            {category.archivedAt && (
              <span className="text-[10px] text-muted-foreground">в архиве</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
