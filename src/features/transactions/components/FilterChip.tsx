import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export interface FilterChipProps {
  isOn: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Переключаемый вариант фильтра. */
export function FilterChip({ isOn, onToggle, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onToggle}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        isOn
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-border bg-white hover:border-primary',
      )}
    >
      {isOn && <Check className="size-3.5 shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </button>
  );
}
