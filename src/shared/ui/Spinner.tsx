import { cn } from '@/shared/lib/cn';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Небольшой индикатор фоновой загрузки (обновление данных без скелетона). */
export function Spinner({ className, label = 'Обновление…' }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <span
        className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
