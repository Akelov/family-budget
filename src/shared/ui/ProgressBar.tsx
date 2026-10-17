import { cn } from '@/shared/lib/cn';

export interface ProgressBarProps {
  /** Процент заполнения; значения больше 100 обрезаются визуально. */
  percent: number;
  tone?: 'ok' | 'warning' | 'over';
  label: string;
}

const TONES = { ok: 'bg-primary', warning: 'bg-warning', over: 'bg-destructive' } as const;

/** Полоса прогресса бюджета или доли расходов. */
export function ProgressBar({ percent, tone = 'ok', label }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      className="h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', TONES[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
