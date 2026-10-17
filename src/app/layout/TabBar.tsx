import { Plus } from 'lucide-react';
import { NavLink } from 'react-router';

import { useTransactionForm } from '@/features/transactions/hooks/transactionFormContext';
import { cn } from '@/shared/lib/cn';

import { NAV_ITEMS } from './navItems';
import { useNavTarget } from './useNavTarget';

/** Нижняя панель телефона и планшета (< 1024 px) с кнопкой «+» по центру. */
export function TabBar() {
  const form = useTransactionForm();
  const target = useNavTarget();
  const [first, second, third, fourth] = NAV_ITEMS;
  const left = [first, second].filter((i) => i !== undefined);
  const right = [third, fourth].filter((i) => i !== undefined);

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => (
    <NavLink
      key={item.to}
      to={target(item.to)}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      <item.icon className="size-[22px]" aria-hidden />
      {item.label}
    </NavLink>
  );

  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {left.map(renderItem)}
      <button
        type="button"
        aria-label="Добавить операцию"
        onClick={() => form.openCreate()}
        className="-mt-7 grid size-[58px] place-items-center justify-self-center rounded-full bg-primary text-white shadow-fab transition-transform active:scale-95"
      >
        <Plus className="size-[26px]" aria-hidden />
      </button>
      {right.map(renderItem)}
    </nav>
  );
}
