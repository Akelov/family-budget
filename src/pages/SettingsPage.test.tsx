import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/renderApp';

describe('Настройки и права ролей', () => {
  it('участник (member) не видит изменения категорий, владелец — видит', async () => {
    const { user } = renderApp('/settings/categories');
    expect(await screen.findAllByRole('button', { name: 'Категория' })).not.toHaveLength(0);

    await user.click(screen.getAllByRole('link', { name: /Для разработчика/ })[0] as HTMLElement);
    await user.click(await screen.findByRole('button', { name: /Даша · Участник/ }));
    expect(await screen.findByText('Вы вошли как Даша')).toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: /Категории/ })[0] as HTMLElement);
    expect(
      await screen.findAllByText('Изменять может владелец или администратор'),
    ).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Категория' })).not.toBeInTheDocument();
  });
});
