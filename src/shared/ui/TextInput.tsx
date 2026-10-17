import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/** Текстовое поле в стиле интерфейса; красная рамка при ошибке. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { hasError = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={hasError || undefined}
      className={cn(
        'h-12 w-full min-w-0 rounded-xl border bg-white px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary',
        hasError ? 'border-destructive' : 'border-border',
        className,
      )}
      {...rest}
    />
  );
});
