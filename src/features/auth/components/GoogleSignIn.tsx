import { LogIn } from 'lucide-react';
import { useState } from 'react';

import { errorMessage } from '@/shared/api/errors';
import { reachGoal } from '@/shared/lib/analytics';
import { Button } from '@/shared/ui/Button';

import { signInWithGoogle } from '../api/authApi';
import { useAuth } from '../hooks/authContext';

export interface GoogleSignInProps {
  /** Страница, куда вернуть после входа (`?next=`). */
  next: string | null;
}

/**
 * Кнопка «Войти через Google» и разделитель «или» над формой email.
 * Показывает ошибку возврата из Google (отмена входа, сбой) и ошибку запуска входа.
 */
export function GoogleSignIn({ next }: GoogleSignInProps) {
  const { oauthError } = useAuth();
  const [error, setError] = useState<string | null>(oauthError);
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function start() {
    setError(null);
    setIsRedirecting(true);
    try {
      await signInWithGoogle(next);
      reachGoal('login_google');
      // Успех — браузер уже уходит на страницу Google, кнопка остаётся в состоянии загрузки.
    } catch (e) {
      setError(errorMessage(e));
      setIsRedirecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="secondary"
        size="lg"
        isBlock
        icon={<LogIn />}
        isLoading={isRedirecting}
        onClick={() => void start()}
      >
        Войти через Google
      </Button>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger-foreground"
        >
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        или по email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
