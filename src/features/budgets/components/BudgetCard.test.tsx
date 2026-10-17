import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/renderApp';

describe('Экран «План» и карточки бюджетов', () => {
  it('показывает статусы по правилам FR-7.4 и подпись о периоде семьи', async () => {
    renderApp('/plan');
    expect(
      await screen.findByText(/Бюджеты считаются по периоду семьи: 29 сентября – 28 октября 2026/),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Кафе и рестораны' })).toBeInTheDocument();
    expect(screen.getByText(/^Превышен на/)).toBeInTheDocument();
    expect(screen.getAllByText('Почти у лимита').length).toBeGreaterThan(0);
  });

  it('без элементов бюджет не сохраняется — подсказка у поля', async () => {
    const { user } = renderApp('/plan');
    await user.click(await screen.findByRole('button', { name: 'Бюджет' }));
    await user.type(screen.getByLabelText(/Название/), 'Отпуск');
    await user.type(screen.getByLabelText(/Сумма на период/), '50000');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(
      screen.getByText('Выберите хотя бы одну категорию или подкатегорию'),
    ).toBeInTheDocument();
  });
});
