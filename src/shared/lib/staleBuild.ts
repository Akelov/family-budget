/*
 * Устаревшая вкладка после публикации новой версии сайта.
 *
 * Разделы загружаются отдельными файлами при первом переходе (React.lazy). Имена файлов
 * содержат хеш версии, и после деплоя на Vercel старые файлы исчезают. Вкладка, открытая
 * до деплоя, просит старый файл — и раздел падает. Лечение — один раз перезагрузить
 * страницу: браузер получит новую версию. Найдено владельцем продукта в ДЗ6.
 */

const RELOAD_KEY = 'family-budget:reloaded-for-update';
/** Повторная перезагрузка раньше этого срока — значит, дело не в версии; не зацикливаемся. */
const RELOAD_COOLDOWN_MS = 60_000;

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /chunkloaderror/i,
];

/**
 * Ошибка загрузки файла раздела (а не ошибка в коде раздела).
 *
 * @param error - пойманная ошибка любого вида
 */
export function isChunkLoadError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

interface ReloadDeps {
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  reload: () => void;
  now: () => number;
}

function defaultDeps(): ReloadDeps {
  let storage: ReloadDeps['storage'] = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Хранилище недоступно (приватный режим) — перезагрузим без защиты от повтора.
  }
  return { storage, reload: () => window.location.reload(), now: Date.now };
}

/**
 * Перезагружает страницу, чтобы получить новую версию сайта, — но не чаще раза в минуту,
 * иначе при настоящей поломке файла страница перезагружалась бы бесконечно.
 *
 * @returns `true`, если перезагрузка запущена
 */
export function reloadForNewVersion(deps: ReloadDeps = defaultDeps()): boolean {
  const last = deps.storage?.getItem(RELOAD_KEY) ?? null;
  if (last !== null && deps.now() - Number(last) < RELOAD_COOLDOWN_MS) return false;
  try {
    deps.storage?.setItem(RELOAD_KEY, String(deps.now()));
  } catch {
    // Не удалось запомнить — всё равно перезагружаем один раз.
  }
  deps.reload();
  return true;
}

/** Vite сообщает о неудачной предзагрузке файлов раздела событием `vite:preloadError`. */
export function installStaleBuildRecovery(target: EventTarget = window): void {
  target.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
}
