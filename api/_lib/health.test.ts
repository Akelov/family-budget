import { describe, expect, it } from 'vitest';

import { isDatabaseAlive, runHealthChecks } from './health';

type Reply = { status: number; body: string } | Error;

function fakeFetch(replies: Record<string, Reply>) {
  const calls: string[] = [];
  const fetchFn = (url: string) => {
    calls.push(url);
    const key = Object.keys(replies).find((part) => url.includes(part));
    const reply = key ? replies[key] : undefined;
    if (!reply) return Promise.reject(new Error('unexpected url'));
    if (reply instanceof Error) return Promise.reject(reply);
    return Promise.resolve({ status: reply.status, text: () => Promise.resolve(reply.body) });
  };
  return { fetchFn, calls };
}

const CONFIG = {
  supabaseUrl: 'https://demo.supabase.co/',
  anonKey: 'public-key',
  version: 'abcdef123456',
};
const AUTH_OK = { status: 200, body: '{"name":"GoTrue"}' };
const DB_OK = {
  status: 401,
  body: '{"code":"42501","message":"permission denied for table households"}',
};

describe('isDatabaseAlive', () => {
  it('отказ в правах от PostgreSQL — база работает', () => {
    expect(isDatabaseAlive(401, DB_OK.body)).toBe(true);
    expect(isDatabaseAlive(200, '[]')).toBe(true);
  });

  it('5xx и ошибки подключения PostgREST — база недоступна', () => {
    expect(isDatabaseAlive(503, '{"code":"PGRST001"}')).toBe(false);
    expect(isDatabaseAlive(401, '{"message":"Invalid API key"}')).toBe(false);
  });
});

describe('runHealthChecks', () => {
  it('всё работает — status ok, версия укорочена до 7 символов', async () => {
    const { fetchFn, calls } = fakeFetch({
      '/auth/v1/health': AUTH_OK,
      '/rest/v1/households': DB_OK,
    });
    const report = await runHealthChecks(CONFIG, fetchFn, () => 1_000);
    expect(report.status).toBe('ok');
    expect(report.version).toBe('abcdef1');
    expect(report.checks.database.ok).toBe(true);
    // Двойной слеш в адресе не появляется.
    expect(calls.every((url) => !url.includes('co//'))).toBe(true);
  });

  it('база не отвечает — degraded и понятная причина', async () => {
    const { fetchFn } = fakeFetch({
      '/auth/v1/health': AUTH_OK,
      '/rest/v1/households': { status: 503, body: '{"code":"PGRST001"}' },
    });
    const report = await runHealthChecks(CONFIG, fetchFn);
    expect(report.status).toBe('degraded');
    expect(report.checks.database).toMatchObject({ ok: false, error: 'HTTP 503' });
    expect(report.checks.auth.ok).toBe(true);
  });

  it('сеть недоступна — degraded, без технических подробностей', async () => {
    const { fetchFn } = fakeFetch({
      '/auth/v1/health': new Error('ECONNREFUSED'),
      '/rest/v1/households': DB_OK,
    });
    const report = await runHealthChecks(CONFIG, fetchFn);
    expect(report.checks.auth).toMatchObject({ ok: false, error: 'network error' });
  });

  it('не заданы адрес и ключ — degraded без запросов', async () => {
    const { fetchFn, calls } = fakeFetch({});
    const report = await runHealthChecks(
      { supabaseUrl: undefined, anonKey: undefined, version: undefined },
      fetchFn,
    );
    expect(report).toMatchObject({ status: 'degraded', version: 'unknown' });
    expect(calls).toHaveLength(0);
  });
});
