import { describe, expect, it } from 'vitest';

import { connectRouterAnalytics, type RouterLike } from './routerAnalytics';

function fakeRouter(start: string) {
  let listener: ((s: { location: { pathname: string } }) => void) | null = null;
  const router: RouterLike = {
    state: { location: { pathname: start } },
    subscribe: (l) => {
      listener = l;
      return () => {
        listener = null;
      };
    },
  };
  const go = (pathname: string) => listener?.({ location: { pathname } });
  return { router, go };
}

describe('connectRouterAnalytics', () => {
  it('считает первую страницу и каждый новый путь', () => {
    const seen: string[] = [];
    const { router, go } = fakeRouter('/');
    connectRouterAnalytics(router, (p) => seen.push(p));
    go('/reports');
    go('/plan');
    expect(seen).toEqual(['/', '/reports', '/plan']);
  });

  it('тот же путь повторно не считает (смена фильтров, перерисовка)', () => {
    const seen: string[] = [];
    const { router, go } = fakeRouter('/reports');
    connectRouterAnalytics(router, (p) => seen.push(p));
    go('/reports');
    expect(seen).toEqual(['/reports']);
  });

  it('после отписки переходы не считаются', () => {
    const seen: string[] = [];
    const { router, go } = fakeRouter('/');
    const stop = connectRouterAnalytics(router, (p) => seen.push(p));
    stop();
    go('/plan');
    expect(seen).toEqual(['/']);
  });
});
