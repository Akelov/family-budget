import { ChartPie, ListOrdered, type LucideIcon, Settings, Target } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Разделы приложения (ТЗ §4.8). */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Операции', icon: ListOrdered },
  { to: '/reports', label: 'Отчёты', icon: ChartPie },
  { to: '/plan', label: 'План', icon: Target },
  { to: '/settings', label: 'Настройки', icon: Settings },
];
