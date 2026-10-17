import { ApiError } from '@/shared/api/errors';
import { supabase } from '@/shared/api/supabaseClient';

/** Адрес сайта для ссылок из писем: корень приложения с учётом базового пути GitHub Pages. */
export function appUrl(path = ''): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

/**
 * Тексты ошибок Supabase Auth → сообщения из приложения B ТЗ.
 * Неизвестные ошибки не показываются как есть (они на английском и технические).
 */
export function authErrorMessage(error: AuthErrorLike): string {
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('invalid_credentials')) return 'Неверный email или пароль';
  if (text.includes('already registered') || text.includes('user_already_exists')) return 'Этот email уже зарегистрирован. Войти?';
  if (text.includes('email not confirmed') || text.includes('email_not_confirmed')) {
    return 'Подтвердите email — ссылка в письме, которое мы отправили';
  }
  if (text.includes('password') && (text.includes('least') || text.includes('weak'))) return 'Пароль — не короче 8 символов';
  if (text.includes('rate limit') || error.status === 429) return 'Слишком много попыток. Подождите минуту и попробуйте снова';
  if (text.includes('fetch') || text.includes('network')) return 'Нет соединения';
  if (text.includes('same password')) return 'Новый пароль совпадает со старым';
  return 'Не удалось выполнить действие. Попробуйте ещё раз';
}

function fail(error: AuthErrorLike | null): void {
  if (error) throw new ApiError('validation', authErrorMessage(error));
}

/** Вход по email и паролю (FR-1.1). */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
  fail(error);
}

/**
 * Регистрация. Supabase отправит письмо со ссылкой подтверждения; по ссылке человек
 * вернётся на сайт уже вошедшим. Возвращает `true`, если вход выполнен сразу
 * (подтверждение email выключено в настройках проекта).
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase().auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: appUrl() },
  });
  fail(error);
  // Supabase не раскрывает, занят ли email: для существующего адреса вернётся пользователь без identities.
  if (data.user && data.user.identities?.length === 0) {
    throw new ApiError('validation', 'Этот email уже зарегистрирован. Войти?');
  }
  return data.session !== null;
}

/** Письмо со ссылкой на смену пароля. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('update-password') });
  fail(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password });
  fail(error);
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}
