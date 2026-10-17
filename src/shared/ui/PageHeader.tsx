import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}

/** Заголовок раздела; надзаголовок виден только на телефоне — на десктопе есть логотип. */
export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3 lg:mb-5">
      <div className="min-w-0">
        {eyebrow && <p className="text-[13px] text-muted-foreground lg:hidden">{eyebrow}</p>}
        <h1 className="truncate text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
      </div>
      {actions}
    </header>
  );
}
