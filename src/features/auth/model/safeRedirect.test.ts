import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from './safeRedirect';

describe('safeRedirectPath', () => {
  it('пропускает путь внутри сайта вместе с параметрами', () => {
    expect(safeRedirectPath('/reports?type=income')).toBe('/reports?type=income');
    expect(safeRedirectPath('/invite/abc')).toBe('/invite/abc');
  });

  it('пустое значение — главная', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'reports',
    '/ok\n//evil.example',
    `/${'a'.repeat(400)}`,
  ])('отклоняет опасный адрес %s', (value) => {
    expect(safeRedirectPath(value)).toBe('/');
  });
});
