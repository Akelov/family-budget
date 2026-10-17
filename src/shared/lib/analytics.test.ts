import { describe, expect, it } from 'vitest';

import { pageUrlForAnalytics, parseCounterId, reachGoal, trackPageView } from './analytics';

describe('parseCounterId', () => {
  it('принимает номер счётчика Метрики', () => {
    expect(parseCounterId('98765432')).toBe(98765432);
    expect(parseCounterId(' 98765432 ')).toBe(98765432);
  });

  it('пустое или неверное значение выключает аналитику', () => {
    expect(parseCounterId(undefined)).toBeNull();
    expect(parseCounterId('')).toBeNull();
    expect(parseCounterId('abc')).toBeNull();
    expect(parseCounterId('123')).toBeNull();
    expect(parseCounterId('1234567890123')).toBeNull();
  });
});

describe('pageUrlForAnalytics', () => {
  it('отрезает параметры и hash', () => {
    expect(pageUrlForAnalytics('/login?next=%2Freports')).toBe('/login');
    expect(pageUrlForAnalytics('/reports#top')).toBe('/reports');
  });

  it('скрывает код приглашения', () => {
    expect(pageUrlForAnalytics('/invite/secret-token-123')).toBe('/invite/:token');
  });

  it('главная страница', () => {
    expect(pageUrlForAnalytics('/')).toBe('/');
    expect(pageUrlForAnalytics('')).toBe('/');
  });
});

describe('без счётчика (тесты, демо-режим)', () => {
  it('события и просмотры ничего не делают и не падают', () => {
    expect(() => {
      reachGoal('transaction_created', { type: 'expense' });
      trackPageView('/reports');
    }).not.toThrow();
    expect(window.ym).toBeUndefined();
  });
});
