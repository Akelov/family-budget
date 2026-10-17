import { describe, expect, it } from 'vitest';

import { currentScreen } from './currentScreen';

describe('currentScreen', () => {
  it('берёт первый сегмент пути после базового адреса', () => {
    expect(currentScreen('/family-budget/reports/category/1', '/family-budget/')).toBe('reports');
  });

  it('главная страница — home', () => {
    expect(currentScreen('/family-budget/', '/family-budget/')).toBe('home');
    expect(currentScreen('/', '/')).toBe('home');
  });

  it('путь вне базового адреса разбирается от корня', () => {
    expect(currentScreen('/settings/developer', '/family-budget/')).toBe('settings');
  });

  it('обрезает слишком длинное имя до 50 символов (ограничение таблицы)', () => {
    expect(currentScreen(`/${'x'.repeat(80)}`, '/')).toHaveLength(50);
  });
});
