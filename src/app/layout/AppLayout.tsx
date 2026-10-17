import { Outlet, useLocation } from 'react-router';

import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { DemoBanner } from './DemoBanner';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';

/**
 * Каркас приложения (концепция 4): на телефоне — нижняя панель с «+», на десктопе —
 * верхняя панель; контент до 1200 px по центру. Снизу отступ больше высоты панели,
 * чтобы «+» не закрывал последнюю операцию (ТЗ §4.8).
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const section = pathname.split('/')[1] || 'operations';
  return (
    <div className="min-h-dvh">
      <TopBar />
      <DemoBanner />
      <main className="mx-auto w-full max-w-[640px] px-4 pt-5 pb-[calc(112px+env(safe-area-inset-bottom))] lg:max-w-[1200px] lg:px-6 lg:pt-7 lg:pb-12">
        <ErrorBoundary key={section} screen={section}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <TabBar />
    </div>
  );
}
