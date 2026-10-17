import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type BadgeTone = 'ok' | 'warning' | 'over' | 'neutral';

export interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

const TONES: Record<BadgeTone, string> = {
  ok: 'bg-accent text-accent-foreground',
  warning: 'bg-warning-bg text-warning-foreground',
  over: 'bg-danger-bg text-danger-foreground',
  neutral: 'bg-muted text-muted-foreground',
};

/** Метка статуса: «В норме», «Почти у лимита», «Превышен», «в архиве». */
export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
