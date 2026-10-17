import { describe, expect, it } from 'vitest';

import { oauthErrorFromUrl, profileFromUser } from './oauth';

describe('profileFromUser', () => {
  it('берёт имя и провайдера из аккаунта Google', () => {
    expect(profileFromUser({ full_name: 'Иван Тестов' }, { provider: 'google' })).toEqual({
      displayName: 'Иван Тестов',
      provider: 'google',
    });
  });

  it('если full_name нет — берёт name; длинное имя обрезает до 40 символов', () => {
    expect(profileFromUser({ name: 'Мария' }, { provider: 'google' }).displayName).toBe('Мария');
    expect(profileFromUser({ full_name: 'а'.repeat(60) }, {}).displayName).toHaveLength(40);
  });

  it('вход по email и метаданные неожиданной формы', () => {
    expect(profileFromUser({}, { provider: 'email' })).toEqual({
      displayName: null,
      provider: 'email',
    });
    expect(profileFromUser(null, 'oops')).toEqual({ displayName: null, provider: 'email' });
    expect(profileFromUser({ full_name: 42 }, { provider: 7 }).displayName).toBeNull();
  });
});

describe('oauthErrorFromUrl', () => {
  it('нет ошибки — null', () => {
    expect(oauthErrorFromUrl('', '')).toBeNull();
    expect(oauthErrorFromUrl('?next=%2F', '#access_token=abc')).toBeNull();
  });

  it('пользователь нажал «Отмена» у Google', () => {
    expect(oauthErrorFromUrl('?error=access_denied&error_description=denied', '')).toBe(
      'Вход через Google отменён',
    );
  });

  it('ошибка сервера в hash — без технических подробностей', () => {
    expect(oauthErrorFromUrl('', '#error=server_error&error_description=Database+error')).toBe(
      'Не удалось войти через Google. Попробуйте ещё раз или войдите по email',
    );
  });
});
