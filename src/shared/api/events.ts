/**
 * Шина изменений данных. После записи (своей или пришедшей через Supabase Realtime
 * от другого участника) API сообщает, какие данные изменились, и экраны перезапрашивают
 * их в фоне (FR-3.13). Одинаково работает и с мок-сервером, и с Supabase.
 */
export type DataTopic = 'session' | 'categories' | 'tags' | 'transactions' | 'budgets';
type Listener = (topics: readonly DataTopic[]) => void;

const listeners = new Set<Listener>();

export const ALL_TOPICS: readonly DataTopic[] = [
  'session',
  'categories',
  'tags',
  'transactions',
  'budgets',
];

/** Сообщить об изменении данных. */
export function emitChange(topics: readonly DataTopic[]): void {
  listeners.forEach((listener) => listener(topics));
}

/** Подписка на изменения. Возвращает функцию отписки. */
export function subscribeChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
