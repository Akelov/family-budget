import { type ReactNode, useMemo } from 'react';

import { fetchCategories } from '@/features/categories/api/categoriesApi';
import { fetchTags } from '@/features/tags/api/tagsApi';
import { errorMessage } from '@/shared/api/errors';
import { getFailMode, setFailMode } from '@/shared/api/mockDb';
import { useQuery } from '@/shared/api/useQuery';
import { buildLookups } from '@/shared/lib/lookups';
import { Button } from '@/shared/ui/Button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { fetchSession } from '../api/householdApi';
import { ReferenceContext, type ReferenceValue } from '../hooks/referenceContext';
import { can } from '../model/permissions';

export interface ReferenceDataProviderProps {
  children: ReactNode;
}

async function fetchReference() {
  const [session, categories, tags] = await Promise.all([
    fetchSession(),
    fetchCategories(),
    fetchTags(),
  ]);
  return { session, categories, tags };
}

/** Загружает семью и справочники до показа экранов; при ошибке — экран с «Повторить». */
export function ReferenceDataProvider({ children }: ReferenceDataProviderProps) {
  const query = useQuery('reference', fetchReference, ['session', 'categories', 'tags']);

  const value = useMemo<ReferenceValue | null>(() => {
    if (!query.data) return null;
    const { session, categories, tags } = query.data;
    const ref = {
      members: session.members,
      categories: categories.categories,
      subcategories: categories.subcategories,
      tags,
    };
    return {
      household: session.household,
      member: session.member,
      ...ref,
      lookups: buildLookups(ref),
      can: (action) => can(session.member.role, action),
      isRefreshing: query.isRefreshing,
    };
  }, [query.data, query.isRefreshing]);

  if (query.status === 'loading') {
    return (
      <div role="status" className="mx-auto max-w-[640px] space-y-4 px-4 py-6">
        <span className="sr-only">Загрузка данных семьи…</span>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (!value) {
    const failMode = getFailMode();
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 py-10">
        <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />
        {failMode && (
          // Без справочников не открывается ни один экран, в том числе настройки, где имитация
          // включалась, — поэтому выключатель дублируется прямо здесь (замечание владельца продукта).
          <div
            role="status"
            className="rounded-2xl bg-warning-bg p-4 text-center text-sm text-warning-foreground"
          >
            <p className="mb-3">
              Включена имитация ошибки {failMode === 'network' ? 'сети' : 'сервера'} (Настройки ›
              Для разработчика).
            </p>
            <Button
              size="sm"
              onClick={() => {
                setFailMode(null);
                window.location.reload();
              }}
            >
              Выключить имитацию
            </Button>
          </div>
        )}
      </div>
    );
  }
  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>;
}
