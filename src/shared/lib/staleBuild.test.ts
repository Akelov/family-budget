import { describe, expect, it } from 'vitest';

import { isChunkLoadError, reloadForNewVersion } from './staleBuild';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('isChunkLoadError', () => {
  it('узнаёт ошибки загрузки файла раздела в разных браузерах', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: /assets/ReportsPage-abc.js'),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
  });

  it('обычные ошибки кода — не ошибка версии', () => {
    expect(
      isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'x')")),
    ).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloadForNewVersion', () => {
  it('перезагружает страницу один раз', () => {
    let reloads = 0;
    const deps = {
      storage: memoryStorage(),
      reload: () => void (reloads += 1),
      now: () => 1_000_000,
    };
    expect(reloadForNewVersion(deps)).toBe(true);
    expect(reloads).toBe(1);
  });

  it('повторная ошибка в течение минуты — без перезагрузки (нет бесконечного цикла)', () => {
    let reloads = 0;
    let time = 1_000_000;
    const deps = { storage: memoryStorage(), reload: () => void (reloads += 1), now: () => time };
    reloadForNewVersion(deps);
    time += 5_000;
    expect(reloadForNewVersion(deps)).toBe(false);
    time += 120_000;
    expect(reloadForNewVersion(deps)).toBe(true);
    expect(reloads).toBe(2);
  });

  it('без хранилища всё равно перезагружает', () => {
    let reloads = 0;
    expect(
      reloadForNewVersion({ storage: null, reload: () => void (reloads += 1), now: () => 1 }),
    ).toBe(true);
    expect(reloads).toBe(1);
  });
});
