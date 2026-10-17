import { currentScreen } from './currentScreen';
import { logError, logWarning } from './logger';

/**
 * «Script error.» — так браузер прячет текст ошибки из скрипта с другого сайта (у нас это
 * Яндекс.Метрика, которую часто ломают блокировщики рекламы). Подробностей в такой записи нет,
 * починить в нашем коде нечего — поэтому это warning, а не error (найдено в журнале, ДЗ6).
 *
 * @param message - текст ошибки из события `error`
 */
export function isOpaqueScriptError(message: string): boolean {
  return /^script error\.?$/i.test(message.trim());
}

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
    if (isOpaqueScriptError(message)) {
      void logWarning({ screen: currentScreen(), code: 'third_party_script', message });
      return;
    }
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
