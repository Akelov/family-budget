import { forwardRef } from 'react';

import { cn } from '@/shared/lib/cn';

export interface AmountInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | undefined;
  isReadOnly?: boolean;
}

/** Крупное поле суммы: цифровая клавиатура, «,» или «.» как разделитель (FR-3.3). */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { id, value, onChange, onBlur, error, isReadOnly = false },
  ref,
) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <label htmlFor={id} className="sr-only">
        Сумма
      </label>
      <div className="flex max-w-full items-baseline justify-center gap-2">
        <input
          ref={ref}
          id={id}
          data-autofocus
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          readOnly={isReadOnly}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,\s]/g, ''))}
          onBlur={onBlur}
          // Ширина по содержимому: знак ₽ стоит сразу за суммой, а не у края поля.
          style={{ width: `${Math.max(1, value.length) + 0.5}ch` }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'num max-w-[260px] min-w-[1.5ch] bg-transparent text-center text-[40px] leading-tight font-bold tracking-tight outline-none placeholder:text-border',
            error && 'text-destructive',
          )}
        />
        <span className="text-3xl font-semibold text-muted-foreground" aria-hidden>
          ₽
        </span>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-center text-[13px] text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-[13px] text-muted-foreground">Сумма</p>
      )}
    </div>
  );
});
