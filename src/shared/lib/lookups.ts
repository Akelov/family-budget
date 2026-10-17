import type { Category, Member, Subcategory, Tag } from '@/shared/types/domain';

/** Справочники семьи, загруженные один раз и доступные всем экранам. */
export interface ReferenceData {
  members: Member[];
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
}

/** Быстрый доступ к справочникам по id. */
export interface Lookups {
  memberById: ReadonlyMap<string, Member>;
  categoryById: ReadonlyMap<string, Category>;
  subcategoryById: ReadonlyMap<string, Subcategory>;
  tagById: ReadonlyMap<string, Tag>;
  /** Подкатегории каждой категории, включая архивные. */
  subcategoriesByCategory: ReadonlyMap<string, Subcategory[]>;
}

/** Строит индексы по id для справочников. */
export function buildLookups(ref: ReferenceData): Lookups {
  const subcategoriesByCategory = new Map<string, Subcategory[]>();
  for (const sub of ref.subcategories) {
    subcategoriesByCategory.set(sub.categoryId, [
      ...(subcategoriesByCategory.get(sub.categoryId) ?? []),
      sub,
    ]);
  }
  return {
    memberById: new Map(ref.members.map((m) => [m.id, m])),
    categoryById: new Map(ref.categories.map((c) => [c.id, c])),
    subcategoryById: new Map(ref.subcategories.map((s) => [s.id, s])),
    tagById: new Map(ref.tags.map((t) => [t.id, t])),
    subcategoriesByCategory,
  };
}

/** Категория подкатегории или `undefined`, если справочник неполон. */
export function categoryOfSubcategory(
  lookups: Lookups,
  subcategoryId: string,
): Category | undefined {
  const sub = lookups.subcategoryById.get(subcategoryId);
  return sub ? lookups.categoryById.get(sub.categoryId) : undefined;
}

/** Имя автора; для исключённых — «<имя> (бывший участник)» (FR-1.7). */
export function authorName(lookups: Lookups, memberId: string): string {
  const member = lookups.memberById.get(memberId);
  if (!member) return 'Неизвестный участник';
  return member.removedAt ? `${member.displayName} (бывший участник)` : member.displayName;
}
