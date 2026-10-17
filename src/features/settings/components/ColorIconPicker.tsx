import { cn } from '@/shared/lib/cn';
import { CATEGORY_BG, CATEGORY_ICONS } from '@/shared/ui/categoryPalette';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import type { CategoryColor } from '@/shared/types/domain';

export interface ColorIconPickerProps {
  color: CategoryColor;
  icon: string;
  onChange: (color: CategoryColor, icon: string) => void;
}

const COLORS: CategoryColor[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Палитра из 12 цветов и набор иконок категории (FR-2.1). */
export function ColorIconPicker({ color, icon, onChange }: ColorIconPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Цвет" className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Цвет ${c}`}
            onClick={() => onChange(c, icon)}
            className={cn(
              'size-8 rounded-full ring-offset-2 transition',
              CATEGORY_BG[c],
              c === color && 'ring-2 ring-foreground',
            )}
          />
        ))}
      </div>
      <div role="radiogroup" aria-label="Иконка" className="flex flex-wrap gap-1.5">
        {Object.keys(CATEGORY_ICONS).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={key === icon}
            aria-label={`Иконка ${key}`}
            onClick={() => onChange(color, key)}
            className={cn('rounded-full p-0.5', key === icon && 'ring-2 ring-foreground')}
          >
            <CategoryIcon icon={key} color={key === icon ? color : 12} size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}
