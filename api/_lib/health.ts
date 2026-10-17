/*
 * Проверка здоровья приложения (ДЗ6, шаг 6) — чистая логика без сети, чтобы её можно было
 * протестировать. Файлы в `api/_lib` Vercel не публикует как отдельные адреса.
 */

export interface CheckResult {
  ok: boolean;
  /** Время ответа сервиса, мс. */
  latencyMs: number;
  /** Короткое пояснение, если проверка не прошла (без секретов и личных данных). */
  error?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  time: string;
  version: string;
  checks: { auth: CheckResult; database: CheckResult };
}

export interface HealthConfig {
  supabaseUrl: string | undefined;
  /** Публичный ключ anon — тот же, что в браузере; секретный ключ проверке не нужен. */
  anonKey: string | undefined;
  version: string | undefined;
}

type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<{
  status: number;
  text: () => Promise<string>;
}>;

/** Сервис, не ответивший за это время, считается недоступным. */
export const CHECK_TIMEOUT_MS = 5_000;

/**
 * Ответила ли база данных. Гостю (`anon`) доступ к таблицам закрыт правами — и это хорошо:
 * отказ `42501 permission denied` формирует сама PostgreSQL, значит, она работает.
 * Если база недоступна, PostgREST отвечает 5xx или кодом `PGRST000/001/002`.
 *
 * @param status - HTTP-статус ответа `/rest/v1/households`
 * @param body - тело ответа
 */
export function isDatabaseAlive(status: number, body: string): boolean {
  if (status === 200) return true;
  if (status >= 500) return false;
  return /"code"\s*:\s*"42501"/.test(body);
}

/** Сервер авторизации жив, если `/auth/v1/health` вернул 200. */
export function isAuthAlive(status: number): boolean {
  return status === 200;
}

async function timed(
  fetchFn: FetchLike,
  url: string,
  headers: Record<string, string>,
  judge: (status: number, body: string) => boolean,
  now: () => number,
): Promise<CheckResult> {
  const started = now();
  try {
    const response = await fetchFn(url, { headers, signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    const body = await response.text();
    const ok = judge(response.status, body);
    return ok
      ? { ok, latencyMs: now() - started }
      : { ok, latencyMs: now() - started, error: `HTTP ${response.status}` };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return {
      ok: false,
      latencyMs: now() - started,
      error: isTimeout ? 'timeout' : 'network error',
    };
  }
}

/**
 * Выполняет проверки и собирает отчёт.
 *
 * @param config - адрес Supabase, публичный ключ, версия сборки
 * @param fetchFn - функция запроса (в тестах — подмена)
 * @param now - текущее время в мс (в тестах — подмена)
 */
export async function runHealthChecks(
  config: HealthConfig,
  fetchFn: FetchLike,
  now: () => number = Date.now,
): Promise<HealthReport> {
  const version = config.version?.slice(0, 7) || 'unknown';
  const time = new Date(now()).toISOString();
  if (!config.supabaseUrl || !config.anonKey) {
    const missing: CheckResult = { ok: false, latencyMs: 0, error: 'not configured' };
    return { status: 'degraded', time, version, checks: { auth: missing, database: missing } };
  }
  const headers = { apikey: config.anonKey };
  const base = config.supabaseUrl.replace(/\/$/, '');
  const [auth, database] = await Promise.all([
    timed(fetchFn, `${base}/auth/v1/health`, headers, (s) => isAuthAlive(s), now),
    timed(fetchFn, `${base}/rest/v1/households?select=id&limit=1`, headers, isDatabaseAlive, now),
  ]);
  return {
    status: auth.ok && database.ok ? 'ok' : 'degraded',
    time,
    version,
    checks: { auth, database },
  };
}
