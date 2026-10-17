import type { ReactNode } from 'react';

export interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

/** Блок раздела настроек с заголовком. */
export function SettingsCard({ title, description, children, actions }: SettingsCardProps) {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
