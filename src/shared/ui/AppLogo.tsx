import { Wallet } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export interface AppLogoProps {
  /** sm — 32 px (заголовок на телефоне), md — 36 px (верхняя панель), lg — 40 px (вход). */
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'size-8 rounded-lg [&_svg]:size-[18px]',
  md: 'size-9 rounded-xl [&_svg]:size-5',
  lg: 'size-10 rounded-xl [&_svg]:size-5',
} as const;

/** Значок приложения — тот же, что на иконке сайта и на рабочем столе телефона. */
export function AppLogo({ size = 'md' }: AppLogoProps) {
  return (
    <span className={cn('grid shrink-0 place-items-center bg-primary text-white', SIZES[size])}>
      <Wallet aria-hidden />
    </span>
  );
}
