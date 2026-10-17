import { WifiOff } from 'lucide-react';

export interface StaleBannerProps {
  onRetry: () => void;
}

/** Баннер ERR-3: показаны последние загруженные данные, обновить не удалось. */
export function StaleBanner({ onRetry }: StaleBannerProps) {
  return (
    <div
      role="status"
      className="mb-3 flex items-center gap-3 rounded-2xl bg-warning-bg px-4 py-3 text-sm text-warning-foreground"
    >
      <WifiOff className="size-[18px] shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">Нет соединения, данные могут быть неактуальны</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 font-semibold underline-offset-2 hover:underline"
      >
        Повторить
      </button>
    </div>
  );
}
