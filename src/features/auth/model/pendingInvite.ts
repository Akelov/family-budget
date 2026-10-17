const KEY = 'family-budget:pending-invite';

/*
 * Токен приглашения запоминается, пока человек регистрируется и подтверждает email:
 * ссылка из письма Supabase ведёт на главную, и без этого приглашение потерялось бы (FR-1.5).
 * Это удобство одного браузера, поэтому localStorage, обёрнутый в try/catch.
 */
export function savePendingInvite(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // Без хранилища человек просто откроет ссылку-приглашение ещё раз.
  }
}

export function readPendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Нечего очищать.
  }
}
