import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  isPadded?: boolean;
}

/** Белая карточка со скруглением 20 px — основной контейнер интерфейса. */
export function Card({ isPadded = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl bg-card shadow-card', isPadded && 'p-4', className)}
      {...rest}
    />
  );
}
