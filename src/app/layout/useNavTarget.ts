import { useLocation } from 'react-router';

const PERIOD_KEYS = ['mode', 'from', 'to'] as const;
/** Разделы, между которыми переносится выбранный период (FR-5.7). */
const PERIOD_SECTIONS = new Set(['/', '/reports']);

/**
 * Адрес вкладки навигации: при переходе между «Операциями» и «Отчётами» выбранный период
 * сохраняется в параметрах адреса. Фильтры и поиск не переносятся.
 */
export function useNavTarget(): (to: string) => string {
  const { pathname, search } = useLocation();
  const current = new URLSearchParams(search);
  const carried = new URLSearchParams();
  if (PERIOD_SECTIONS.has(pathname)) {
    for (const key of PERIOD_KEYS) {
      const value = current.get(key);
      if (value) carried.set(key, value);
    }
  }
  const query = carried.toString();
  return (to) => (PERIOD_SECTIONS.has(to) && query ? `${to}?${query}` : to);
}
