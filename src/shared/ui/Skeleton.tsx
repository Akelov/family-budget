import { cn } from '@/shared/lib/cn';

export interface SkeletonProps {
  className?: string;
}

/** Заглушка-скелетон на время загрузки (FR-3.8). */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-muted', className)} />;
}
