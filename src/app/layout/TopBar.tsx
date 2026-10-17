import { Plus, Wallet } from 'lucide-react';
import { NavLink } from 'react-router';

import { useReference } from '@/features/household/hooks/referenceContext';
import { useTransactionForm } from '@/features/transactions/hooks/transactionFormContext';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';

import { NAV_ITEMS } from './navItems';
import { useNavTarget } from './useNavTarget';

/** Верхняя панель десктопа (≥ 1024 px): логотип, вкладки, участники, «+ Добавить». */
export function TopBar() {
  const { household, members } = useReference();
  const form = useTransactionForm();
  const target = useNavTarget();
  const active = members.filter((m) => m.removedAt === null);

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-card/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-6">
        <NavLink to="/" className="flex min-w-0 items-center gap-2.5 font-semibold">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white">
            <Wallet className="size-5" aria-hidden />
          </span>
          <span className="truncate">{household.name}</span>
        </NavLink>
        <nav aria-label="Разделы" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={target(item.to)}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div
            className="flex -space-x-2"
            aria-label={`Участники: ${active.map((m) => m.displayName).join(', ')}`}
          >
            {active.map((m) => (
              <Avatar key={m.id} name={m.displayName} />
            ))}
          </div>
          <Button icon={<Plus />} onClick={() => form.openCreate()}>
            Добавить
          </Button>
        </div>
      </div>
    </header>
  );
}
