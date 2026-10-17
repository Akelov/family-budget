import { useState } from 'react';
import { Link } from 'react-router';

import { sendPasswordReset } from '@/features/auth/api/authApi';
import { AuthForm } from '@/features/auth/components/AuthForm';

/** Восстановление пароля по ссылке из письма (FR-1.1). */
export default function ResetPasswordPage() {
  const [isSent, setIsSent] = useState(false);
  if (isSent) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-xl font-semibold">Письмо отправлено</h1>
        <p className="text-sm text-muted-foreground">
          Если такой email зарегистрирован, в письме будет ссылка для нового пароля.
        </p>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          Ко входу
        </Link>
      </div>
    );
  }
  return (
    <AuthForm
      title="Восстановление пароля"
      submitLabel="Отправить ссылку"
      hasPassword={false}
      onSubmit={async ({ email }) => {
        await sendPasswordReset(email);
        setIsSent(true);
      }}
      footer={
        <Link to="/login" className="text-center text-sm text-muted-foreground hover:underline">
          Вспомнили пароль? Войти
        </Link>
      }
    />
  );
}
