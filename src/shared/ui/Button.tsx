import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isBlock?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-primary-soft',
  secondary: 'bg-muted text-foreground hover:bg-border',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-danger-bg text-danger-foreground hover:bg-[#f6d5d5]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 [&_svg]:size-4',
  md: 'h-11 px-[18px] text-[15px] gap-2 [&_svg]:size-[18px]',
  lg: 'h-[52px] px-5 text-base gap-2 [&_svg]:size-5',
};

/** Кнопка интерфейса. Во время сохранения показывает индикатор и блокирует повторное нажатие. */
export function Button({
  variant = 'primary',
  size = 'md',
  isBlock = false,
  isLoading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors',
        VARIANTS[variant],
        SIZES[size],
        // В ряду с другой кнопкой «растянутая» кнопка занимает остаток места, а не 100% ширины:
        // с shrink-0 и w-full она выходила за край окна (замечание владельца продукта).
        isBlock ? 'w-full min-w-0 flex-1' : 'shrink-0',
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
