import { cn } from '@/shared/lib/cn';
import type { Subcategory } from '@/shared/types/domain';

export interface SubcategoryPickerProps {
  id: string;
  subcategories: Subcategory[];
  value: string | null;
  onChange: (subcategoryId: string) => void;
  error?: string | undefined;
  isDisabled?: boolean;
}

/** Подкатегории выбранной категории — обязательный выбор (FR-3.2). */
export function SubcategoryPicker({
  id,
  subcategories,
  value,
  onChange,
  error,
  isDisabled = false,
}: SubcategoryPickerProps) {
  return (
    <div>
      <div
        id={id}
        role="radiogroup"
        tabIndex={-1}
        aria-label="Подкатегория"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex flex-wrap gap-2 outline-none"
      >
        {subcategories.map((sub) => {
          const isOn = sub.id === value;
          return (
            <button
              key={sub.id}
              type="button"
              role="radio"
              aria-checked={isOn}
              disabled={isDisabled}
              onClick={() => onChange(sub.id)}
              className={cn(
                'max-w-full truncate rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-default',
                isOn
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white hover:border-primary',
                error && !isOn && 'border-destructive',
              )}
            >
              {sub.name}
              {sub.archivedAt && (
                <span
                  className={cn('ml-1 text-xs', isOn ? 'text-white/80' : 'text-muted-foreground')}
                >
                  · в архиве
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
