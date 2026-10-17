import type { TransactionFilters } from './types';

const LIST_KEYS = {
  cat: 'categoryIds',
  sub: 'subcategoryIds',
  tag: 'tagIds',
  author: 'authorIds',
} as const;

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  return raw ? raw.split(',').filter(Boolean) : [];
}

/**
 * Читает фильтры из параметров адреса (FR-3.14): `type`, `cat`, `sub`, `tag`, `author`.
 * Неизвестный тип игнорируется.
 */
export function filtersFromParams(params: URLSearchParams): TransactionFilters {
  const type = params.get('type');
  return {
    type: type === 'income' || type === 'expense' ? type : null,
    categoryIds: readList(params, 'cat'),
    subcategoryIds: readList(params, 'sub'),
    tagIds: readList(params, 'tag'),
    authorIds: readList(params, 'author'),
  };
}

/**
 * Записывает фильтры в параметры адреса, не трогая остальные (период, поиск).
 * Пустые фильтры удаляются, чтобы адрес оставался коротким.
 */
export function writeFiltersToParams(
  params: URLSearchParams,
  filters: TransactionFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (filters.type) next.set('type', filters.type);
  else next.delete('type');
  for (const [key, field] of Object.entries(LIST_KEYS)) {
    const values = filters[field];
    if (values.length > 0) next.set(key, values.join(','));
    else next.delete(key);
  }
  return next;
}
