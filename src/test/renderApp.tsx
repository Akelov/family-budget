import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import { routes } from '@/app/router';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { resetDb } from '@/shared/api/mockDb';
import { createSeed } from '@/shared/api/seed';
import { ToastProvider } from '@/shared/ui/toast/ToastProvider';

import { TODAY } from './fixtures';

/**
 * Рендерит приложение целиком на заданном адресе с демо-данными на дату TODAY.
 * Подменяются только часы (Date): таймеры остаются настоящими, чтобы работали
 * задержки поиска и мок-сервера.
 */
export function renderApp(path = '/') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
  resetDb(createSeed(TODAY));
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>,
  );
  return { ...view, user, router };
}
