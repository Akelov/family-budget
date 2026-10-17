import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { signUp } from '@/features/auth/api/authApi';
import { AuthForm } from '@/features/auth/components/AuthForm';

/** Регистрация (FR-1.1): письмо со ссылкой подтверждения, после неё — экран «Создать семью». */
export default function SignupPage() {
  const navigate = useNavigate();
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-accent text-primary">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">Проверьте почту</h1>
        <p className="text-sm text-muted-foreground">
          Мы отправили письмо на <b className="text-foreground">{sentTo}</b>. Откройте ссылку из
          письма — и вы окажетесь в приложении. Письма нет? Загляните в «Спам».
        </p>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          Ко входу
        </Link>
      </div>
    );
  }

  return (
    <AuthForm
      title="Регистрация"
      submitLabel="Создать аккаунт"
      passwordAutocomplete="new-password"
      onSubmit={async ({ email, password }) => {
        const isSignedIn = await signUp(email, password);
        if (isSignedIn) navigate('/', { replace: true });
        else setSentTo(email.trim());
      }}
      footer={
        <Link to="/login" className="text-center text-sm font-medium text-primary hover:underline">
          Уже есть аккаунт? Войти
        </Link>
      }
    />
  );
}
