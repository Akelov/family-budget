import { createContext, useContext } from 'react';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthValue {
  status: AuthStatus;
  email: string | null;
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
