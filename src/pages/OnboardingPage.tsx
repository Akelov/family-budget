import { Mail, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';

import { readPendingInvite } from '@/features/auth/model/pendingInvite';
import { useAuth } from '@/features/auth/hooks/authContext';
import { createHousehold, fetchSession } from '@/features/household/api/householdApi';
import { ApiError, errorMessage } from '@/shared/api/errors';
import { useQuery } from '@/shared/api/useQuery';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Skeleton } from '@/shared/ui/Skeleton';
import { TextInput } from '@/shared/ui/TextInput';

/** «Создать семью» — для вошедшего пользователя без семьи (FR-1.2, FR-1.3). */
export default function OnboardingPage() {
  const id = useId();
  const navigate = useNavigate();
  const { email, signOut } = useAuth();
  const session = useQuery('onboarding', fetchSession, ['session']);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState(email?.split('@')[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingInvite = readPendingInvite();

  if (session.status === 'loading') return <Skeleton className="m-8 h-40" />;
  // Семья уже есть — сразу в приложение.
  if (session.data) return <Navigate to="/" replace />;
  if (session.error instanceof ApiError && session.error.code === 'unauthorized')
    return <Navigate to="/login" replace />;

  async function create() {
    if (!name.trim()) {
      setError('Введите название семьи');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createHousehold(name.trim(), displayName.trim());
      navigate('/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-card">
        <span className="mb-4 grid size-12 place-items-center rounded-full bg-accent text-primary">
          <Users className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">Создайте семью</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Вы станете владельцем, а готовый набор категорий добавится сам. Близких пригласите по
          ссылке из настроек.
        </p>
        {pendingInvite && (
          <Link
            to={`/invite/${pendingInvite}`}
            className="mt-4 flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground"
          >
            <Mail className="size-4" aria-hidden /> У вас есть приглашение в семью — принять
          </Link>
        )}
        <form
          noValidate
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <Field id={`${id}-name`} label="Название семьи">
            <TextInput
              id={`${id}-name`}
              value={name}
              maxLength={50}
              placeholder="Например, Семья Ивановых"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field id={`${id}-me`} label="Ваше имя в семье">
            <TextInput
              id={`${id}-me`}
              value={displayName}
              maxLength={40}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger-foreground"
            >
              {error}
            </p>
          )}
          <Button type="submit" isBlock size="lg" isLoading={isSaving}>
            Создать семью
          </Button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm text-muted-foreground hover:underline"
          >
            Выйти из аккаунта {email}
          </button>
        </form>
      </div>
    </main>
  );
}
