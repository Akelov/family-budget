import type {
  Budget,
  Category,
  Household,
  Member,
  Subcategory,
  Tag,
  Transaction,
} from '@/shared/types/domain';

import { ApiError } from './errors';
import { createSeed } from './seed';

/**
 * Мок-бэкенд для ДЗ4: хранит данные семьи в памяти и в localStorage браузера.
 * Интерфейс модулей `features/*\/api` повторяет RPC из ТЗ §3.3, поэтому в ДЗ5 меняется
 * только реализация этих модулей (Supabase), а компоненты и хуки остаются прежними.
 */
export interface DbState {
  version: typeof DB_VERSION;
  household: Household;
  members: Member[];
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
  transactions: Transaction[];
  budgets: Budget[];
  /** Кто «вошёл» в приложение. До ДЗ5 (Supabase Auth) переключается в настройках. */
  currentMemberId: string;
}

export const DB_VERSION = 1;
const STORAGE_KEY = 'family-budget:mock-db';
const FAIL_KEY = 'family-budget:fail';

/** Темы изменений — аналог каналов Supabase Realtime (FR-3.13). */
export type DbTopic = 'session' | 'categories' | 'tags' | 'transactions' | 'budgets';
type Listener = (topics: readonly DbTopic[]) => void;

let state: DbState | null = null;
const listeners = new Set<Listener>();

function isDbState(value: unknown): value is DbState {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === DB_VERSION &&
    typeof record.household === 'object' &&
    Array.isArray(record.members) &&
    Array.isArray(record.transactions) &&
    typeof record.currentMemberId === 'string'
  );
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isDbState(parsed)) return parsed;
    }
  } catch {
    // Повреждённые или недоступные данные браузера — начинаем с демо-набора.
  }
  return createSeed();
}

function persist(next: DbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Приватный режим или переполнение хранилища: данные останутся в памяти до перезагрузки.
  }
}

/** Текущее состояние базы (только чтение). */
export function readDb(): DbState {
  state ??= load();
  return state;
}

/**
 * Применяет изменение к базе, сохраняет его и оповещает подписчиков.
 *
 * @param topics - какие данные изменились (для перезапроса на экранах)
 * @param update - чистая функция «старое состояние → новое»
 */
export function writeDb(topics: readonly DbTopic[], update: (db: DbState) => DbState): void {
  state = update(readDb());
  persist(state);
  listeners.forEach((listener) => listener(topics));
}

/** Подписка на изменения базы. Возвращает функцию отписки. */
export function subscribeDb(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Сбрасывает базу к демо-данным (кнопка в настройках и тесты). */
export function resetDb(seed: DbState = createSeed()): void {
  writeDb(['session', 'categories', 'tags', 'transactions', 'budgets'], () => seed);
}

// Другая вкладка браузера изменила данные — как будто пришло событие Realtime от другого участника.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = null;
    listeners.forEach((listener) =>
      listener(['session', 'categories', 'tags', 'transactions', 'budgets']),
    );
  });
}

/** Задержка ответа «сервера», чтобы были видны состояния загрузки. В тестах — 0. */
function latency(): number {
  return import.meta.env.MODE === 'test' ? 0 : 250 + Math.round(Math.random() * 250);
}

/**
 * Имитация ошибок для отладки (Настройки › Для разработчика): значение `network` или `server`
 * заставляет все запросы падать с соответствующей ошибкой.
 */
export function getFailMode(): 'network' | 'server' | null {
  try {
    const value = localStorage.getItem(FAIL_KEY);
    return value === 'network' || value === 'server' ? value : null;
  } catch {
    return null;
  }
}

export function setFailMode(mode: 'network' | 'server' | null): void {
  try {
    if (mode) localStorage.setItem(FAIL_KEY, mode);
    else localStorage.removeItem(FAIL_KEY);
  } catch {
    // Без хранилища режим ошибок просто не включится.
  }
}

/**
 * Выполняет «запрос к серверу»: задержка, возможная имитированная ошибка, затем обработчик.
 * Результат клонируется, чтобы компоненты не могли случайно изменить «серверные» данные.
 */
export function request<T>(handler: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      const fail = getFailMode();
      if (fail) {
        reject(new ApiError(fail));
        return;
      }
      try {
        resolve(structuredClone(handler()));
      } catch (error) {
        reject(error instanceof Error ? error : new ApiError('server'));
      }
    }, latency());
  });
}

/** Текущий участник; если его исключили — ошибка доступа. */
export function currentMember(db: DbState): Member {
  const member = db.members.find((m) => m.id === db.currentMemberId && m.removedAt === null);
  if (!member) throw new ApiError('forbidden');
  return member;
}

let lastTimestamp = 0;

/**
 * Метка времени для `created_at` / `updated_at`. Строго возрастает, даже если два изменения
 * пришлись на одну миллисекунду, — иначе проверка конфликта (ERR-8) могла бы их не различить.
 */
export function nowIso(): string {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
  return new Date(lastTimestamp).toISOString();
}
