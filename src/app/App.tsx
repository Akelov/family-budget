import { RouterProvider } from 'react-router';

import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ToastProvider } from '@/shared/ui/toast/ToastProvider';

import { router } from './router';

/** Корень приложения: уведомления → вход (Supabase Auth) → маршруты. */
export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
