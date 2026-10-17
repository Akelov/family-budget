import { type FormEvent, type ReactNode, useId, useState } from 'react';

import { errorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { TextInput } from '@/shared/ui/TextInput';

export interface AuthFormProps {
  title: string;
  submitLabel: string;
  hasEmail?: boolean;
  hasPassword?: boolean;
  passwordAutocomplete?: 'current-password' | 'new-password';
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  footer?: ReactNode;
  intro?: ReactNode;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/** Общая форма входа, регистрации и смены пароля: проверка полей, ошибки сервера, загрузка. */
export function AuthForm({
  title,
  submitLabel,
  hasEmail = true,
  hasPassword = true,
  passwordAutocomplete = 'current-password',
  onSubmit,
  footer,
  intro,
}: AuthFormProps) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (hasEmail && !EMAIL_PATTERN.test(email.trim())) {
      setError('Введите email, например name@example.com');
      return;
    }
    if (hasPassword && password.length < MIN_PASSWORD_LENGTH) {
      setError('Пароль — не короче 8 символов');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ email, password });
    } catch (e) {
      setError(errorMessage(e));
      // После неудачного входа поле пароля очищается (ТЗ §6.3).
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {intro}
      {hasEmail && (
        <Field id={`${id}-email`} label="Email">
          <TextInput id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      )}
      {hasPassword && (
        <Field id={`${id}-password`} label="Пароль" hint="Не короче 8 символов">
          <TextInput
            id={`${id}-password`}
            type="password"
            autoComplete={passwordAutocomplete}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger-foreground">
          {error}
        </p>
      )}
      <Button type="submit" isBlock size="lg" isLoading={isSubmitting}>
        {submitLabel}
      </Button>
      {footer}
    </form>
  );
}
