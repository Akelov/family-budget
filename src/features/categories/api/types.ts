import type { Category, CategoryColor, Subcategory, TransactionType } from '@/shared/types/domain';

export interface CategoriesData {
  categories: Category[];
  subcategories: Subcategory[];
}

export interface NewCategory {
  type: TransactionType;
  name: string;
  color: CategoryColor;
  icon: string;
  /** Первая подкатегория обязательна (FR-2.2). */
  subcategoryName: string;
}
