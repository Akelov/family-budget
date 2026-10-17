import { Link, useNavigate, useSearchParams } from 'react-router';

import { signIn } from '@/features/auth/api/authApi';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { GoogleSignIn } from '@/features/auth/components/GoogleSignIn';
import { safeRedirectPath } from '@/features/auth/model/safeRedirect';
import { reachGoal } from '@/shared/lib/analytics';

/** Вход по email и паролю; после входа — возврат на страницу, с которой отправили на вход (ERR-5). */
export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  // Возвращаем только на свои страницы, а не на внешний адрес из параметра (OWASP A01).
  const target = safeRedirectPath(next);

  return (
    <AuthForm
      title="Вход"
      submitLabel="Войти"
      intro={<GoogleSignIn next={next} />}
      onSubmit={async ({ email, password }) => {
        await signIn(email, password);
        reachGoal('login');
        navigate(target, { replace: true });
      }}
      footer={
        <div className="flex flex-col gap-2 text-center text-sm">
          <Link
            to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-medium text-primary hover:underline"
          >
            Нет аккаунта? Зарегистрироваться
          </Link>
          <Link to="/reset-password" className="text-muted-foreground hover:underline">
            Забыли пароль?
          </Link>
        </div>
      }
    />
  );
}
