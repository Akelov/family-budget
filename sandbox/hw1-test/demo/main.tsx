import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TransactionCard } from '../src/TransactionCard';
import { formatMoney } from '../src/format';
import type { Transaction } from '../src/types';

const MOCK: Transaction[] = [
  { id: '1', type: 'income', amount: 85000, category: 'Зарплата', author: 'Папа', date: '2026-10-10' },
  { id: '2', type: 'expense', amount: 3450, category: 'Продукты', author: 'Мама', date: '2026-10-14', comment: 'Пятёрочка' },
  { id: '3', type: 'expense', amount: 1290.5, category: 'Транспорт', author: 'Папа', date: '2026-10-15', comment: 'Заправка, АИ-95, 22 литра на трассе М-11 по дороге на дачу' },
  { id: '4', type: 'expense', amount: 12000, category: 'Кружки детей', author: 'Мама', date: '2026-10-15', comment: 'Бассейн, абонемент на месяц' },
  { id: '5', type: 'income', amount: 4500, category: 'Кэшбэк', author: 'Мама', date: '2026-10-16' },
];

function App() {
  const [items, setItems] = useState(MOCK);
  const balance = items.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  return (
    <main className="page">
      <header className="page__header">
        <h1>Семейный бюджет</h1>
        <p className="page__balance">
          Баланс за октябрь: <strong>{formatMoney(balance)}</strong>
        </p>
      </header>
      <section className="list">
        {items.map((t) => (
          <TransactionCard
            key={t.id}
            transaction={t}
            onDelete={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
