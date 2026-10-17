import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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
