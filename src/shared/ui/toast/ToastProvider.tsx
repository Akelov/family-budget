import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { createId } from '@/shared/lib/id';

import { ToastContext, type ToastOptions } from './toastContext';

interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastProviderProps {
  children: ReactNode;
}

const DEFAULT_DURATION_MS = 4000;

/** Очередь уведомлений внизу экрана. Одновременно показывается одно — новое заменяет старое. */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = useCallback(() => setToast(null), []);

  const show = useCallback((options: ToastOptions) => {
    setToast({ ...options, id: createId() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    timer.current = setTimeout(dismiss, toast.durationMs ?? DEFAULT_DURATION_MS);
    return () => clearTimeout(timer.current);
  }, [toast, dismiss]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-6"
      >
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-lg',
              toast.tone === 'error' ? 'bg-danger-foreground' : 'bg-foreground',
            )}
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="shrink-0 rounded-full px-2 py-1 font-semibold text-[#9fe0bb] hover:bg-white/10"
                onClick={() => {
                  toast.action?.onAction();
                  dismiss();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
