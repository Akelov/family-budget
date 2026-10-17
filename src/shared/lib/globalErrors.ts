import { currentScreen } from './currentScreen';
import { logError } from './logger';

function reasonMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return 'Неизвестная причина';
}

/**
 * Подключает запись в журнал ошибок, которые не поймал ни один обработчик: исключение
 * в обработчике события (`error`) и отклонённый промис без `catch` (`unhandledrejection`).
 * Падения при отрисовке ловит ErrorBoundary, а этот перехватчик — всё остальное.
 *
 * @param target - объект, на который вешаются слушатели (в тестах — отдельный EventTarget)
 * @returns функция отключения слушателей
 */
export function installGlobalErrorLogging(target: EventTarget = window): () => void {
  const onError = (event: Event) => {
    const message = event instanceof ErrorEvent ? event.message : 'Ошибка без описания';
    void logError({
      screen: currentScreen(),
      code: 'uncaught',
      message: message || 'Ошибка без описания',
    });
  };
  const onRejection = (event: Event) => {
    const reason: unknown = 'reason' in event ? event.reason : undefined;
    void logError({
      screen: currentScreen(),
      code: 'unhandled_rejection',
      message: reasonMessage(reason),
    });
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
