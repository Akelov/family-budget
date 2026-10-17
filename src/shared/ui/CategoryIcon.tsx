import { CircleEllipsis } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { CategoryColor } from '@/shared/types/domain';

import { CATEGORY_BG, CATEGORY_ICONS } from './categoryPalette';

export interface CategoryIconProps {
  icon: string;
  color: CategoryColor;
  size?: 'sm' | 'md';
  className?: string;
}

/** Круглая иконка категории в её цвете. Неизвестная иконка заменяется на «…». */
export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[icon] ?? CircleEllipsis;
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full text-white',
        size === 'md' ? 'size-10 [&_svg]:size-[19px]' : 'size-8 [&_svg]:size-4',
        CATEGORY_BG[color],
        className,
      )}
    >
      <Icon />
    </span>
  );
}
