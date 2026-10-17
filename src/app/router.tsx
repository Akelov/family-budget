import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';

import { LoadingState } from '@/shared/ui/LoadingState';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { RequireAuth } from '@/features/auth/components/RequireAuth';

import { ProtectedApp } from './layout/ProtectedApp';

// Страницы загружаются лениво: код «Отчётов» с Recharts не грузится, пока раздел не открыт.
const OperationsPage = lazy(() => import('@/pages/OperationsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const PlanPage = lazy(() => import('@/pages/PlanPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const UpdatePasswordPage = lazy(() => import('@/pages/UpdatePasswordPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const InvitePage = lazy(() => import('@/pages/InvitePage'));

function page(node: ReactNode) {
  return <Suspense fallback={<LoadingState rows={4} />}>{node}</Suspense>;
}

/** Маршруты (ТЗ §4.8). Экспортируются отдельно, чтобы тесты собирали их в памяти. */
export const routes: RouteObject[] = [
  {
    // Вход, регистрация, восстановление пароля (FR-1.1)
    element: <AuthLayout />,
    children: [
      { path: 'login', element: page(<LoginPage />) },
      { path: 'signup', element: page(<SignupPage />) },
      { path: 'reset-password', element: page(<ResetPasswordPage />) },
    ],
  },
  { path: 'update-password', element: <RequireAuth>{page(<UpdatePasswordPage />)}</RequireAuth> },
  { path: 'onboarding', element: <RequireAuth>{page(<OnboardingPage />)}</RequireAuth> },
  { path: 'invite/:token', element: page(<InvitePage />) },
  {
    element: <ProtectedApp />,
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
