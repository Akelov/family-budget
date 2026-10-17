/**
 * Аналитика: Яндекс.Метрика (ДЗ6, шаг 4).
 *
 * Принципы:
 * - номер счётчика берётся из `VITE_YANDEX_METRIKA_ID`; без него (локально, в тестах,
 *   в демо-режиме) все функции ничего не делают;
 * - в Метрику уходят только **названия событий** и неличные параметры (тип операции, роль) —
 *   никаких сумм, комментариев, имён и email (данные о деньгах семьи — личные);
 * - Вебвизор (запись экрана) выключен по той же причине.
 */

/** События, которые отслеживаем (цели Метрики). */
export type AnalyticsGoal =
  | 'sign_up'
  | 'login'
  | 'login_google'
  | 'household_created'
  | 'invite_created'
  | 'invite_accepted'
  | 'transaction_created'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'budget_created';

/** Допустимые параметры события: короткие строки-категории, без личных данных. */
export type GoalParams = Record<string, 'income' | 'expense' | 'admin' | 'member'>;

type YmFunction = (counterId: number, method: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    ym?: YmFunction & { a?: unknown[][]; l?: number };
  }
}

const TAG_URL = 'https://mc.yandex.ru/metrika/tag.js';

/**
 * Номер счётчика из переменной окружения. Некорректное значение — аналитика выключена.
 *
 * @param raw - значение `VITE_YANDEX_METRIKA_ID`
 */
export function parseCounterId(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^\d{5,12}$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

const COUNTER_ID: number | null =
  import.meta.env.MODE === 'test' ? null : parseCounterId(import.meta.env.VITE_YANDEX_METRIKA_ID);

/** Включена ли аналитика в этой сборке. */
export const isAnalyticsEnabled = COUNTER_ID !== null;

function ym(method: string, ...args: unknown[]): void {
  if (COUNTER_ID === null || typeof window === 'undefined' || !window.ym) return;
  try {
    window.ym(COUNTER_ID, method, ...args);
  } catch {
    // Сбой аналитики (блокировщик рекламы, сеть) не должен ломать приложение.
  }
}

/**
 * Подключает счётчик: очередь вызовов `window.ym` (как в официальном коде Метрики,
 * но без inline-скрипта — его запретила бы CSP) и загрузка `tag.js`.
 */
export function initAnalytics(): void {
  if (COUNTER_ID === null || typeof document === 'undefined' || window.ym) return;
  const queue: unknown[][] = [];
  const stub: YmFunction & { a?: unknown[][]; l?: number } = (...args: unknown[]) => {
    queue.push(args);
  };
  stub.a = queue;
  stub.l = Date.now();
  window.ym = stub;
  const script = document.createElement('script');
  script.async = true;
  script.src = TAG_URL;
  document.head.appendChild(script);
  ym('init', {
    defer: true, // просмотры страниц отправляем сами при смене маршрута (SPA)
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });
}

/**
 * Просмотр страницы. В одностраничном приложении адрес меняется без перезагрузки,
 * поэтому каждый переход отправляется вручную. Параметры адреса (`?next=`, коды
 * приглашений) отрезаются — в них могут быть личные данные.
 *
 * @param path - путь страницы, например `/reports`
 */
export function trackPageView(path: string): void {
  ym('hit', pageUrlForAnalytics(path), { title: document.title });
}

/**
 * Адрес страницы для аналитики: без строки запроса и hash, код приглашения заменён
 * на `:token` (иначе по адресу можно было бы восстановить чужую ссылку-приглашение).
 *
 * @param path - путь страницы, например `/invite/abc?x=1`
 */
export function pageUrlForAnalytics(path: string): string {
  const clean = path.split(/[?#]/)[0] ?? '/';
  return clean.replace(/^\/invite\/[^/]+/, '/invite/:token') || '/';
}

/**
 * Достигнута цель (событие).
 *
 * @param goal - название события
 * @param params - неличные параметры, например `{ type: 'expense' }`
 */
export function reachGoal(goal: AnalyticsGoal, params?: GoalParams): void {
  ym('reachGoal', goal, params);
}
