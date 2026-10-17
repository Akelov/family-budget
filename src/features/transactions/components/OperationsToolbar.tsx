import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';

import { countActiveFilters } from '../model/filter';
import type { TransactionFilters } from '../model/types';
import { FiltersDialog } from './FiltersDialog';
import { SearchField } from './SearchField';

export interface OperationsToolbarProps {
  search: string;
  filters: TransactionFilters;
  onSearch: (value: string) => void;
  onFilters: (filters: TransactionFilters) => void;
}

/** Поиск и кнопка «Фильтры» с числом активных фильтров. */
export function OperationsToolbar({
  search,
  filters,
  onSearch,
  onFilters,
}: OperationsToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = countActiveFilters(filters);
  return (
    <div className="flex gap-2">
      <SearchField value={search} onChange={onSearch} />
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium shadow-card transition-colors sm:px-4',
          active > 0 ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-muted',
        )}
        aria-label={active > 0 ? `Фильтры, активно: ${active}` : 'Фильтры'}
      >
        <SlidersHorizontal className="size-[17px]" aria-hidden />
        <span className="hidden sm:inline">Фильтры</span>
        {active > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
            {active}
          </span>
        )}
      </button>
      {isOpen && (
        <FiltersDialog
          initial={filters}
          onClose={() => setIsOpen(false)}
          onApply={(next) => {
            onFilters(next);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
