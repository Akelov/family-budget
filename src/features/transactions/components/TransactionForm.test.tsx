import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readDb } from '@/shared/api/mockDb';
import { renderApp } from '@/test/renderApp';

async function openForm() {
  const app = renderApp('/');
  await screen.findAllByRole('region', { name: /17 октября/ });
  await app.user.click(
    screen.getAllByRole('button', { name: 'Добавить операцию' })[0] as HTMLElement,
  );
  await screen.findByRole('dialog', { name: 'Новая операция' });
  return app;
}

describe('Форма операции', () => {
  it('при сохранении с ошибками показывает их и переводит фокус на первое поле (ERR-1)', async () => {
    const { user } = await openForm();
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByText('Введите сумму больше 0 с точностью до копеек')).toBeInTheDocument();
    expect(screen.getByText('Выберите категорию и подкатегорию')).toBeInTheDocument();
    expect(screen.getByLabelText('Сумма')).toHaveFocus();
  });

  it('сохраняет корректную операцию с новым тегом', async () => {
    const { user } = await openForm();
    await user.type(screen.getByLabelText('Сумма'), '1 250,50');
    await user.click(screen.getByRole('radio', { name: /Автомобиль/ }));
    await user.click(screen.getByRole('radio', { name: 'Парковка' }));
    await user.type(screen.getByLabelText('Теги'), 'Дача{Enter}');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Операция добавлена')).toBeInTheDocument();
    const saved = readDb().transactions.at(-1);
    expect(saved).toMatchObject({
      amount: 125_050,
      subcategoryId: 'sub-car-6',
      authorId: 'm-alexey',
    });
    expect(readDb().tags.find((t) => t.name === 'Дача')).toBeDefined();
  });

  it('удаление показывает «Отменить», которое возвращает операцию (FR-3.6)', async () => {
    const { user } = renderApp('/');
    const [first] = await screen.findAllByRole('button', { name: /Транспорт › Общественный/ });
    await user.click(first as HTMLElement);
    await screen.findByRole('dialog', { name: 'Изменить операцию' });
    const before = readDb().transactions.filter((t) => t.deletedAt === null).length;
    await user.click(screen.getByRole('button', { name: 'Удалить операцию' }));
    const undo = await screen.findByRole('button', { name: 'Отменить' });
    expect(readDb().transactions.filter((t) => t.deletedAt === null)).toHaveLength(before - 1);
    await user.click(undo);
    await waitFor(() =>
      expect(readDb().transactions.filter((t) => t.deletedAt === null)).toHaveLength(before),
    );
  });
});
