import { type HealthConfig, runHealthChecks } from './_lib/health.js';

/**
 * GET /api/health — состояние приложения для мониторинга (UptimeRobot, GitHub Actions).
 *
 * 200 и `"status":"ok"` — сайт, вход и база работают; 503 и `"status":"degraded"` — что-то
 * недоступно (в `checks` видно, что именно). Ответ не кешируется.
 */
export async function GET(): Promise<Response> {
  const config: HealthConfig = {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    version: process.env.APP_VERSION,
  };
  const report = await runHealthChecks(config, (url, init) => fetch(url, init));
  return new Response(JSON.stringify(report), {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
