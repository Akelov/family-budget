/**
 * Название текущего экрана для журнала ошибок: первый сегмент пути после базового адреса
 * сайта (`/family-budget/reports/…` → `reports`). Главная страница — `home`.
 *
 * @param pathname - путь страницы (по умолчанию — текущий адрес браузера)
 * @param base - базовый адрес сборки (`/family-budget/` на GitHub Pages, `/` локально)
 */
export function currentScreen(
  pathname: string = typeof window === 'undefined' ? '/' : window.location.pathname,
  base: string = import.meta.env.BASE_URL,
): string {
  const rest = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname.replace(/^\//, '');
  const first = rest.split('/')[0] ?? '';
  return first === '' ? 'home' : first.slice(0, 50);
}
