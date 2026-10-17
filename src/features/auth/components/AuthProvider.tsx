import type { Session } from '@supabase/supabase-js';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { isSupabaseEnabled } from '@/shared/api/config';
import { emitChange, ALL_TOPICS } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';

import { signOut as apiSignOut } from '../api/authApi';
import { AuthContext, type AuthStatus, type AuthValue } from '../hooks/authContext';
import { oauthErrorFromUrl, profileFromUser, type UserProfile } from '../model/oauth';

const EMPTY_PROFILE: UserProfile = { displayName: null, provider: 'email' };

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
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  // Ошибку из адреса читаем один раз при запуске: дальше роутер уводит на /login и адрес меняется.
  const [oauthError] = useState(() =>
    typeof window === 'undefined'
      ? null
      : oauthErrorFromUrl(window.location.search, window.location.hash),
  );

  useEffect(() => {
    if (!isSupabaseEnabled) return undefined;
    const auth = supabase().auth;
    const apply = (session: Session | null) => {
      setStatus(session ? 'signedIn' : 'signedOut');
      setEmail(session?.user.email ?? null);
      setProfile(
        session
          ? profileFromUser(session.user.user_metadata, session.user.app_metadata)
          : EMPTY_PROFILE,
      );
    };
    void auth.getSession().then(({ data }) => apply(data.session));
    const { data } = auth.onAuthStateChange((event, session) => {
      apply(session);
      // Новый пользователь — данные прежнего на экране показывать нельзя.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') emitChange(ALL_TOPICS);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      email,
      displayName: profile.displayName,
      provider: profile.provider,
      oauthError,
      isDemo: !isSupabaseEnabled,
      signOut: apiSignOut,
    }),
    [status, email, profile, oauthError],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
