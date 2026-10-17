import type { Period } from '@/shared/types/domain';

/**
 * Ссылка на экран с периодом и фильтрами в параметрах адреса (FR-3.14, FR-4.4, FR-7.6).
 *
 * @param path - путь экрана, например `/`
 * @param period - период
 * @param extra - дополнительные параметры (`sub`, `tag`, `type` …); пустые значения пропускаются
 */
export function linkWithPeriod(
  path: string,
  period: Period,
  extra: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams({ mode: period.mode, from: period.from, to: period.to });
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return `${path}?${params.toString()}`;
}
