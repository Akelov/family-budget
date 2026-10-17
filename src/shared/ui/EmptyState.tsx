import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Пустое состояние списка (ТЗ §6.2). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-10 text-center shadow-card">
      <span className="grid size-12 place-items-center rounded-full bg-accent text-primary [&_svg]:size-6">
        {icon}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
