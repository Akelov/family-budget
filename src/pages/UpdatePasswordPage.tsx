import { useNavigate } from 'react-router';

import { updatePassword } from '@/features/auth/api/authApi';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { useToast } from '@/shared/ui/toast/toastContext';

/** Новый пароль: сюда ведёт ссылка из письма восстановления (человек уже вошёл по ней). */
export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-card">
        <AuthForm
          title="Новый пароль"
          submitLabel="Сохранить пароль"
          hasEmail={false}
          passwordAutocomplete="new-password"
          onSubmit={async ({ password }) => {
            await updatePassword(password);
            toast.show({ message: 'Пароль изменён' });
            navigate('/', { replace: true });
          }}
        />
      </div>
    </main>
  );
}
