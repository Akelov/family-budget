import type { BudgetItem } from '@/shared/types/domain';

export interface BudgetInput {
  name: string;
  amount: number;
  items: BudgetItem[];
}
