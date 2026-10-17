import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/renderApp';

describe('Экран «Отчёты»', () => {
  it('раскрывает категорию до подкатегорий и ведёт в операции с фильтром (FR-4.3, FR-4.4)', async () => {
    const { user, router } = renderApp('/reports');
    const list = await screen.findByRole('list', { name: 'Расходы' });
    await user.click(await screen.findByRole('button', { name: /^Автомобиль/ }));
    expect(await screen.findByRole('button', { name: /Все категории/ })).toBeInTheDocument();
    expect(list).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /^Топливо/ }));
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.location.search).toContain('sub=sub-car-1');
    expect(router.state.location.search).toContain('from=2026-09-29');
  });

  it('вкладка «Теги» с пояснением о повторном учёте', async () => {
    const { user } = renderApp('/reports');
    await user.click(await screen.findByRole('radio', { name: 'Теги' }));
    expect(await screen.findByText(/учитывается в каждом из них/)).toBeInTheDocument();
  });
});
