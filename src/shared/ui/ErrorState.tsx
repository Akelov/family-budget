import { CloudOff } from 'lucide-react';

import { Button } from './Button';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/** Состояние «ошибка загрузки» с кнопкой «Повторить» (ERR-4). */
export function ErrorState({ message = 'Не удалось загрузить данные', onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-10 text-center shadow-card"
    >
      <span className="grid size-12 place-items-center rounded-full bg-danger-bg text-destructive">
        <CloudOff className="size-6" aria-hidden />
      </span>
      <p className="font-medium">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}
