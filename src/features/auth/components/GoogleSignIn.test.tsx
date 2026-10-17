import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { AuthContext, type AuthValue } from '../hooks/authContext';
import { GoogleSignIn } from './GoogleSignIn';

// Обычная функция вместо vi.fn(): шпион Vitest 4 в модульном моке сообщал об отклонённом
// промисе как о необработанной ошибке, хотя компонент её перехватывает.
const google = vi.hoisted(() => ({
  calls: [] as (string | null)[],
  result: (): Promise<void> => Promise.resolve(),
}));

vi.mock('../api/authApi', () => ({
  signInWithGoogle: (next: string | null) => {
    google.calls.push(next);
    return google.result();
  },
}));

function renderButton(oauthError: string | null = null, next: string | null = '/reports') {
  const auth: AuthValue = {
    status: 'signedOut',
    email: null,
    displayName: null,
    provider: 'email',
    oauthError,
    isDemo: false,
    signOut: () => Promise.resolve(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <GoogleSignIn next={next} />
    </AuthContext.Provider>,
  );
}

describe('GoogleSignIn', () => {
  beforeEach(() => {
    google.calls = [];
    google.result = () => Promise.resolve();
  });

  it('по нажатию запускает вход через Google с адресом возврата', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Войти через Google/ }));
    expect(google.calls).toEqual(['/reports']);
    // Браузер уходит на Google — кнопка остаётся заблокированной.
    expect(screen.getByRole('button', { name: /Войти через Google/ })).toBeDisabled();
  });

  it('показывает ошибку, если вход не удалось открыть, и снова даёт нажать', async () => {
    google.result = () =>
      Promise.reject(new ApiError('validation', 'Не удалось открыть вход через Google'));
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Войти через Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось открыть вход через Google',
    );
    expect(screen.getByRole('button', { name: /Войти через Google/ })).toBeEnabled();
  });

  it('показывает ошибку возврата из Google (например, вход отменён)', () => {
    renderButton('Вход через Google отменён');
    expect(screen.getByRole('alert')).toHaveTextContent('Вход через Google отменён');
  });
});
