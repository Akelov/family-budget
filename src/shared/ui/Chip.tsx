import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export interface ChipProps {
  children: ReactNode;
  className?: string;
}

/** Тег операции в списке. */
export function Chip({ children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-block max-w-full truncate rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}
