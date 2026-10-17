import { createContext, useContext } from 'react';

import type { SignInMethod } from '../model/oauth';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthValue {
  status: AuthStatus;
  email: string | null;
  /** Имя из аккаунта Google — подсказка для имени участника; у входа по email — `null`. */
  displayName: string | null;
  /** Как вошёл пользователь: по email или через Google. */
  provider: SignInMethod;
  /** Ошибка возврата из Google (отмена, сбой) — показывается на экране входа. */
  oauthError: string | null;
  /** Демо-режим без сервера: вход не нужен. */
  isDemo: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

/** Состояние входа. Доступно внутри `AuthProvider`. */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth нужно вызывать внутри AuthProvider');
  return value;
}
