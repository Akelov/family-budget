import { useAuth } from '@/features/auth/hooks/authContext';

import { DemoToolsSection } from './DemoToolsSection';
import { LogCheckCard } from './LogCheckCard';

/**
 * Раздел «Для разработчика»: на мок-данных — вход как, имитация ошибок, сброс;
 * с настоящим сервером — только проверка журнала ошибок.
 */
export function DeveloperSection() {
  const { isDemo } = useAuth();
  return isDemo ? <DemoToolsSection /> : <LogCheckCard />;
}
