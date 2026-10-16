import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { TransactionCard } from '../src/TransactionCard';
import type { Transaction } from '../src/types';

const expense: Transaction = {
  id: 't1',
  type: 'expense',
  amount: 3450,
  category: 'Продукты',
  author: 'Мама',
  date: '2026-10-14',
  comment: 'Пятёрочка',
};

test('TransactionCard: расход отображается с минусом и классом expense', () => {
  const html = renderToStaticMarkup(<TransactionCard transaction={expense} />);
  assert.match(html, /tx-card--expense/);
  assert.match(html, /−3 450 ₽/);
  assert.match(html, /Продукты/);
  assert.match(html, /Мама · 14 окт\./);
});

test('TransactionCard: без комментария блок комментария не выводится', () => {
  const html = renderToStaticMarkup(
    <TransactionCard transaction={{ ...expense, comment: undefined }} />,
  );
  assert.doesNotMatch(html, /tx-card__comment/);
});

test('TransactionCard: кнопка удаления есть только при переданном onDelete', () => {
  const without = renderToStaticMarkup(<TransactionCard transaction={expense} />);
  const withDelete = renderToStaticMarkup(
    <TransactionCard transaction={expense} onDelete={() => {}} />,
  );
  assert.doesNotMatch(without, /<button/);
  assert.match(withDelete, /aria-label="Удалить операцию «Продукты»"/);
});
