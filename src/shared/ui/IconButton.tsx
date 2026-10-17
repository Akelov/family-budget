import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Подпись для экранного диктора — у кнопки-иконки нет видимого текста. */
  label: string;
  children: ReactNode;
}

/** Круглая кнопка с иконкой; область нажатия 40×40 px. */
export function IconButton({
  label,
  children,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 [&_svg]:size-[18px]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
