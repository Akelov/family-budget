import { Skeleton } from './Skeleton';

export interface LoadingStateProps {
  rows?: number;
  label?: string;
}

/** Состояние «загрузка» для списков: скелетоны строк и скрытая подпись для диктора. */
export function LoadingState({ rows = 5, label = 'Загрузка…' }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="rounded-2xl bg-card p-2 shadow-card">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
