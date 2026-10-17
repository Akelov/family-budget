import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';

import { LoadingState } from '@/shared/ui/LoadingState';

import { AppLayout } from './layout/AppLayout';

// Страницы загружаются лениво: код «Отчётов» с Recharts не грузится, пока раздел не открыт.
const OperationsPage = lazy(() => import('@/pages/OperationsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const PlanPage = lazy(() => import('@/pages/PlanPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function page(node: ReactNode) {
  return <Suspense fallback={<LoadingState rows={4} />}>{node}</Suspense>;
}

/** Маршруты (ТЗ §4.8). Экспортируются отдельно, чтобы тесты собирали их в памяти. */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: page(<OperationsPage />) },
      { path: 'reports', element: page(<ReportsPage />) },
      { path: 'plan', element: page(<PlanPage />) },
      { path: 'settings/:section?', element: page(<SettingsPage />) },
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
];

export const router = createBrowserRouter(
  routes,
  // BASE_URL задаёт Vite: «/» на Vercel и «/family-budget/» на GitHub Pages.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);
