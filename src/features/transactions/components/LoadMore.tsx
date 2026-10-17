import { useEffect, useRef } from 'react';

import { Button } from '@/shared/ui/Button';

export interface LoadMoreProps {
  isLoading: boolean;
  hasError: boolean;
  onLoadMore: () => void;
}

/** Подгрузка следующей порции при прокрутке до конца списка; кнопка — запасной вариант. */
export function LoadMore({ isLoading, hasError, onLoadMore }: LoadMoreProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined' || hasError) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMoreRef.current();
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasError]);

  return (
    <div ref={sentinel} className="flex flex-col items-center gap-2 py-4">
      {hasError && <p className="text-sm text-destructive">Не удалось загрузить данные</p>}
      <Button variant="secondary" size="sm" isLoading={isLoading} onClick={onLoadMore}>
        {hasError ? 'Повторить' : 'Показать ещё'}
      </Button>
    </div>
  );
}
