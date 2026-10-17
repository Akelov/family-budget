import { cn } from '@/shared/lib/cn';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}

const COLORS = ['bg-cat-4', 'bg-cat-7', 'bg-cat-1', 'bg-cat-5', 'bg-cat-2', 'bg-cat-10'] as const;

/** Цвет аватара стабилен для имени: простая сумма кодов символов. */
function colorFor(name: string): string {
  const sum = [...name].reduce((acc, ch) => acc + (ch.codePointAt(0) ?? 0), 0);
  return COLORS[sum % COLORS.length] ?? 'bg-cat-4';
}

/** Кружок с первой буквой имени участника. */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-white',
        size === 'sm' ? 'size-7 text-xs' : 'size-9 text-sm',
        colorFor(name),
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
