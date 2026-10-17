import { createContext, useContext } from 'react';

import type { Lookups } from '@/shared/lib/lookups';
import type { Category, Household, Member, Subcategory, Tag } from '@/shared/types/domain';

import type { Action } from '../model/permissions';

/** Данные семьи, нужные всем экранам: семья, текущий участник, справочники и права. */
export interface ReferenceValue {
  household: Household;
  member: Member;
  members: Member[];
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
  lookups: Lookups;
  can: (action: Action) => boolean;
  /** Идёт фоновое обновление справочников. */
  isRefreshing: boolean;
}

export const ReferenceContext = createContext<ReferenceValue | null>(null);

/** Справочники семьи. Доступны внутри `ReferenceDataProvider`. */
export function useReference(): ReferenceValue {
  const value = useContext(ReferenceContext);
  if (!value) throw new Error('useReference нужно вызывать внутри ReferenceDataProvider');
  return value;
}
