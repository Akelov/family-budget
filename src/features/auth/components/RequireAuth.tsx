import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { Skeleton } from '@/shared/ui/Skeleton';

import { useAuth } from '../hooks/authContext';

export interface RequireAuthProps {
  children: ReactNode;
}

/** Пускает дальше только вошедших; остальных отправляет на вход с адресом возврата (ERR-5). */
export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div role="status" className="mx-auto max-w-sm space-y-3 px-4 py-16">
        <span className="sr-only">Проверяем вход…</span>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (status === 'signedOut') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} replace />;
  }
  return <>{children}</>;
}
