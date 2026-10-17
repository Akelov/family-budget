import { describe, expect, it } from 'vitest';

import { filtersFromParams, writeFiltersToParams } from './params';
import { EMPTY_FILTERS } from './types';

describe('параметры адреса фильтров (FR-3.14)', () => {
  it('читает списки через запятую и игнорирует неизвестный тип', () => {
    expect(filtersFromParams(new URLSearchParams('type=transfer&sub=a,b&tag=t'))).toEqual({
      ...EMPTY_FILTERS,
      subcategoryIds: ['a', 'b'],
      tagIds: ['t'],
    });
  });

  it('записывает фильтры, сохраняя период и поиск, и удаляет пустые', () => {
    const params = new URLSearchParams('mode=month&from=2026-10-01&to=2026-10-31&q=кофе&tag=old');
    const next = writeFiltersToParams(params, {
      ...EMPTY_FILTERS,
      type: 'income',
      authorIds: ['m1'],
    });
    expect(next.toString()).toBe(
      new URLSearchParams(
        'mode=month&from=2026-10-01&to=2026-10-31&q=кофе&type=income&author=m1',
      ).toString(),
    );
  });
});
