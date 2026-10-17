import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export interface FieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  isRequired?: boolean;
  children: ReactNode;
  className?: string;
}

/** Подпись, поле и сообщение об ошибке под ним (ERR-1). Поле связывается с ошибкой через aria-describedby. */
export function Field({
  id,
  label,
  error,
  hint,
  isRequired = false,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-muted-foreground">
        {label}
        {isRequired && (
          <span className="text-destructive" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
