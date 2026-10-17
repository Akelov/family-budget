import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Экраны грузят данные через мок-сервер и ленивые страницы; под нагрузкой (CI, параллельные
// тесты) 1 секунды по умолчанию для findBy/waitFor не хватало — тесты падали случайно.
configure({ asyncUtilTimeout: 4000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

// jsdom не реализует ResizeObserver и IntersectionObserver — их используют Recharts и подгрузка списка.
class ObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ObserverStub;
