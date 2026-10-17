import { useEffect } from 'react';

import { isSupabaseEnabled } from '@/shared/api/config';
import { emitChange } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';

/**
 * Supabase Realtime (FR-3.13): когда другой участник меняет операции семьи, экраны
 * перезапрашивают историю, сводку, отчёты и бюджеты. Правила RLS действуют и для событий —
 * чужие семьи их не получают; фильтр по household_id лишь уменьшает трафик.
 */
export function useRealtime(householdId: string | null): void {
  useEffect(() => {
    if (!isSupabaseEnabled || !householdId) return undefined;
    const channel = supabase()
      .channel(`household-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `household_id=eq.${householdId}`,
        },
        () => emitChange(['transactions', 'budgets', 'tags']),
      )
      .subscribe();
    return () => {
      void supabase().removeChannel(channel);
    };
  }, [householdId]);
}
