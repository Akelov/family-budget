import { describe, expect, it } from 'vitest';

import { authErrorMessage } from './authApi';

describe('authErrorMessage — тексты ошибок входа (приложение B ТЗ)', () => {
  it('переводит известные ошибки Supabase Auth', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Неверный email или пароль',
    );
    expect(authErrorMessage({ code: 'user_already_exists' })).toBe(
      'Этот email уже зарегистрирован. Войти?',
    );
    expect(authErrorMessage({ message: 'Email not confirmed' })).toMatch(/Подтвердите email/);
    expect(authErrorMessage({ status: 429, message: 'too many' })).toMatch(/Слишком много попыток/);
  });

  it('незнакомые технические ошибки не показывает', () => {
    expect(authErrorMessage({ message: 'unexpected_failure: db error' })).toBe(
      'Не удалось выполнить действие. Попробуйте ещё раз',
    );
  });
});
