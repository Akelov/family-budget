/** Способ входа, который сайт умеет показывать пользователю. */
export type SignInMethod = 'email' | 'google';

/** Данные профиля, которые сайт берёт из аккаунта Supabase Auth. */
export interface UserProfile {
  /** Имя из аккаунта Google (`full_name` / `name`); у входа по email — `null`. */
  displayName: string | null;
  provider: SignInMethod;
}

const MAX_NAME_LENGTH = 40;

function stringField(source: unknown, key: string): string | null {
  if (typeof source !== 'object' || source === null || !(key in source)) return null;
  const value: unknown = (source as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Профиль пользователя из метаданных Supabase Auth.
 *
 * Метаданные приходят от провайдера (Google) и имеют произвольную форму, поэтому
 * разбираются как `unknown`. Имя обрезается до 40 символов — лимит имени участника в базе.
 *
 * @param userMetadata - `user.user_metadata` (имя, фото от Google)
 * @param appMetadata - `user.app_metadata` (поле `provider`: `email`, `google`, …)
 */
export function profileFromUser(userMetadata: unknown, appMetadata: unknown): UserProfile {
  const name = stringField(userMetadata, 'full_name') ?? stringField(userMetadata, 'name');
  const provider = stringField(appMetadata, 'provider') === 'google' ? 'google' : 'email';
  return { displayName: name ? name.slice(0, MAX_NAME_LENGTH) : null, provider };
}

/**
 * Ошибка входа через Google из адреса, на который вернул Supabase после OAuth.
 * Supabase передаёт её в параметрах `error` / `error_description` — в строке запроса
 * или после `#`. Технический текст пользователю не показывается.
 *
 * @param search - `location.search`, например `?error=access_denied`
 * @param hash - `location.hash`, например `#error=server_error&error_description=…`
 * @returns понятное сообщение или `null`, если ошибки нет
 */
export function oauthErrorFromUrl(search: string, hash: string): string | null {
  const params = [new URLSearchParams(search), new URLSearchParams(hash.replace(/^#/, ''))];
  const code = params.map((p) => p.get('error')).find((value) => value !== null);
  if (!code) return null;
  if (code === 'access_denied') return 'Вход через Google отменён';
  return 'Не удалось войти через Google. Попробуйте ещё раз или войдите по email';
}
