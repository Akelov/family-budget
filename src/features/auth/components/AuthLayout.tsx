import { Wallet } from 'lucide-react';
import { Navigate, Outlet } from 'react-router';

import { useAuth } from '../hooks/authContext';

/**
 * Каркас экранов входа и регистрации: логотип и карточка по центру.
 * Вошедший пользователь сюда не попадает — его отправляем в приложение.
 */
export function AuthLayout() {
  const { status, isDemo } = useAuth();
  if (isDemo || status === 'signedIn') return <Navigate to="/" replace />;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5 text-lg font-semibold">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
          <Wallet className="size-5" aria-hidden />
        </span>
        Семейный бюджет
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-card">
        <Outlet />
      </div>
    </main>
  );
}
