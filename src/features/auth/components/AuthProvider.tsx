import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { isSupabaseEnabled } from '@/shared/api/config';
import { emitChange, ALL_TOPICS } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';

import { signOut as apiSignOut } from '../api/authApi';
import { AuthContext, type AuthStatus, type AuthValue } from '../hooks/authContext';

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Следит за входом через Supabase Auth: сессия хранится в браузере и обновляется сама.
 * В демо-режиме (без сервера) пользователь считается вошедшим.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseEnabled ? 'loading' : 'signedIn');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseEnabled) return undefined;
    const auth = supabase().auth;
    void auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'signedIn' : 'signedOut');
      setEmail(data.session?.user.email ?? null);
    });
    const { data } = auth.onAuthStateChange((event, session) => {
      setStatus(session ? 'signedIn' : 'signedOut');
      setEmail(session?.user.email ?? null);
      // Новый пользователь — данные прежнего на экране показывать нельзя.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') emitChange(ALL_TOPICS);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ status, email, isDemo: !isSupabaseEnabled, signOut: apiSignOut }),
    [status, email],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
