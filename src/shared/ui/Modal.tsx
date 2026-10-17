import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';

import { IconButton } from './IconButton';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Ширина окна на десктопе. */
  size?: 'md' | 'lg';
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Модальное окно: на телефоне — нижний лист, с 640 px — окно по центру (FR-3.1).
 * Закрывается по Esc и клику на фон, удерживает фокус внутри и возвращает его после закрытия.
 */
export function Modal({ title, onClose, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const firstItem = items[0];
      const lastItem = items.at(-1);
      if (!firstItem || !lastItem) return;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-[rgb(20_26_23/0.45)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-[22px] bg-card shadow-xl sm:max-h-[min(860px,92dvh)] sm:rounded-[22px]',
          size === 'md' ? 'sm:max-w-[460px]' : 'sm:max-w-[560px]',
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 sm:pt-5">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <IconButton label="Закрыть" onClick={onClose} className="-mr-2">
            <X />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {children}
        </div>
        {footer && (
          <footer className="border-t border-border px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
