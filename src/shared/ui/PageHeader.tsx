import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  /** Строка над заголовком (только на телефоне): текст или значок с названием семьи. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

/** Заголовок раздела; надзаголовок виден только на телефоне — на десктопе есть логотип. */
export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3 lg:mb-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[13px] text-muted-foreground lg:hidden">{eyebrow}</div>
        )}
        <h1 className="truncate text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
      </div>
      {actions}
    </header>
  );
}
