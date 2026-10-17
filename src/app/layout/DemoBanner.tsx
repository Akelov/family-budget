import { Bug } from 'lucide-react';
import { Link } from 'react-router';

import { isSupabaseEnabled } from '@/shared/api/config';
import { getFailMode } from '@/shared/api/mockDb';

/** Предупреждение, что включена имитация ошибок (Настройки › Для разработчика). */
export function DemoBanner() {
  const mode = isSupabaseEnabled ? null : getFailMode();
  if (!mode) return null;
  return (
    <div
      role="status"
      className="bg-danger-bg px-4 py-2 text-center text-[13px] text-danger-foreground"
    >
      <Bug className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />
      Включена имитация ошибки {mode === 'network' ? 'сети' : 'сервера'}.{' '}
      <Link to="/settings/developer" className="font-semibold underline">
        Выключить
      </Link>
    </div>
  );
}
