import { UserPlus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import { useAuth } from '@/features/auth/hooks/authContext';
import { clearPendingInvite, savePendingInvite } from '@/features/auth/model/pendingInvite';
import { acceptInvite } from '@/features/household/api/householdApi';
import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { TextInput } from '@/shared/ui/TextInput';

/** Принятие приглашения по ссылке /invite/:token (FR-1.5). */
export default function InvitePage() {
  const { token = '' } = useParams();
  const id = useId();
  const navigate = useNavigate();
  const { email, status } = useAuth();
  const [name, setName] = useState(email?.split('@')[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => savePendingInvite(token), [token]);

  // Без входа: запоминаем приглашение и ведём на вход; после регистрации оно не потеряется.
  if (status === 'signedOut') {
    savePendingInvite(token);
    return <Navigate to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} replace />;
  }

  async function accept() {
    setIsSaving(true);
    setError(null);
    try {
      await acceptInvite(token, name.trim());
      clearPendingInvite();
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
          <UserPlus className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">Приглашение в семью</h1>
        <p className="mt-1 text-sm text-muted-foreground">Вы будете видеть и вести общий бюджет вместе с семьёй.</p>
        <div className="mt-5 flex flex-col gap-4">
          <Field id={`${id}-name`} label="Ваше имя в семье">
            <TextInput id={`${id}-name`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger-foreground">
              {error}
            </p>
          )}
          <Button isBlock size="lg" isLoading={isSaving} onClick={() => void accept()}>
            Принять приглашение
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearPendingInvite();
              navigate('/onboarding');
            }}
          >
            Не сейчас
          </Button>
        </div>
      </div>
    </main>
  );
}
