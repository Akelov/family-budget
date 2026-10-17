import { isAnalyticsEnabled, trackPageView } from '@/shared/lib/analytics';

/** Минимум от роутера, нужный для подсчёта просмотров (подходит `createBrowserRouter`). */
export interface RouterLike {
  state: { location: { pathname: string } };
  subscribe: (listener: (state: { location: { pathname: string } }) => void) => () => void;
}

/**
 * Отправляет просмотр страницы при открытии сайта и при каждой смене пути. Смена только
 * параметров (`?type=income`) или повторная отрисовка того же пути просмотром не считается.
 *
 * @param router - роутер приложения
 * @param track - отправка просмотра (в тестах — подмена)
 * @returns отписка от роутера
 */
export function connectRouterAnalytics(
  router: RouterLike,
  track: (path: string) => void = trackPageView,
): () => void {
  let lastPath = router.state.location.pathname;
  track(lastPath);
  return router.subscribe((state) => {
    if (state.location.pathname === lastPath) return;
    lastPath = state.location.pathname;
    track(lastPath);
  });
}

/** Подключает аналитику переходов, только если счётчик задан в сборке. */
export function startRouterAnalytics(router: RouterLike): void {
  if (isAnalyticsEnabled) connectRouterAnalytics(router);
}
