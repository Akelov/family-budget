import { createContext, useContext } from 'react';

export interface ToastOptions {
  message: string;
  tone?: 'default' | 'error';
  action?: { label: string; onAction: () => void };
  /** Длительность показа, мс (для «Отменить» удаления — 5000, FR-3.6). */
  durationMs?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Показ уведомлений из любого компонента внутри `ToastProvider`. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast нужно вызывать внутри ToastProvider');
  return api;
}
