import { cn } from '@/shared/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  isAccent?: boolean;
  className?: string;
}

/** Переключатель-«таблетка» (Расход/Доход, Месяц/Цикл/Диапазон). Семантика — группа радиокнопок. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  isAccent = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-muted p-1', className)}
    >
      {options.map((option) => {
        const isOn = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors',
              isOn
                ? 'bg-white shadow-[0_1px_3px_rgb(0_0_0/0.1)]'
                : 'text-muted-foreground hover:text-foreground',
              isOn && (isAccent ? 'text-primary' : 'text-foreground'),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
