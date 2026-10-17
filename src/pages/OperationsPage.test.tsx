import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { setFailMode } from '@/shared/api/mockDb';
import { renderApp } from '@/test/renderApp';

describe('Экран «Операции»', () => {
  it('показывает период семьи, сводку и историю по дням', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Операции' })).toBeInTheDocument();
    expect(screen.getByText('29 сентября – 28 октября 2026')).toBeInTheDocument();
    expect(
      await screen.findAllByRole('region', { name: 'Суббота, 17 октября 2026 г.' }),
    ).not.toHaveLength(0);
    const income = await screen.findByText('Доход');
    expect(within(income.parentElement as HTMLElement).getByText(/^\+/)).toBeInTheDocument();
  });

  it('поиск сужает историю и показывает подпись про фильтры', async () => {
    const { user } = renderApp('/');
    await screen.findAllByRole('region', { name: /17 октября/ });
    await user.type(screen.getByRole('searchbox', { name: 'Поиск по операциям' }), 'замена масла');
    await waitFor(() => expect(screen.getAllByText(/Замена масла/).length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.queryByText(/Перекрёсток/)).not.toBeInTheDocument());
    expect(screen.getAllByText(/по результатам поиска и фильтров/i).length).toBeGreaterThan(0);
  });

  it('пустой период — подсказка «Добавить операцию»', async () => {
    renderApp('/?mode=month&from=2030-01-01&to=2030-01-31');
    expect(await screen.findByText('В этом периоде пока нет операций')).toBeInTheDocument();
    // Кнопка в пустом состоянии и «+» в нижней панели.
    expect(screen.getAllByRole('button', { name: 'Добавить операцию' })).toHaveLength(2);
  });

  it('ошибка сервера — экран с «Повторить», после восстановления данные загружаются (ERR-4)', async () => {
    const { user } = renderApp('/');
    await screen.findAllByRole('region', { name: /17 октября/ });
    setFailMode('server');
    await user.click(screen.getByRole('button', { name: 'Следующий период' }));
    const retry = await screen.findByRole('button', { name: 'Повторить' }, { timeout: 3000 });
    expect(screen.getByText('Не удалось загрузить данные')).toBeInTheDocument();
    setFailMode(null);
    await user.click(retry);
    expect(await screen.findByText('В этом периоде пока нет операций')).toBeInTheDocument();
  });
});
