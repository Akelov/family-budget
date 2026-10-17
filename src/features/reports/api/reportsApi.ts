import { readDb, request } from '@/shared/api/mockDb';
import { buildLookups } from '@/shared/lib/lookups';
import type { Period, TransactionType } from '@/shared/types/domain';

import {
  reportByCategory,
  reportBySubcategory,
  reportByTag,
  type ReportRow,
} from '../model/aggregate';

export interface Report {
  rows: ReportRow[];
  total: number;
}

function periodTransactions(period: Pick<Period, 'from' | 'to'>) {
  return readDb().transactions.filter(
    (tx) => tx.deletedAt === null && tx.date >= period.from && tx.date <= period.to,
  );
}

/** `report_by_category`. */
export function fetchCategoryReport(
  period: Pick<Period, 'from' | 'to'>,
  type: TransactionType,
): Promise<Report> {
  return request(() => reportByCategory(periodTransactions(period), type, buildLookups(readDb())));
}

/** `report_by_subcategory`. */
export function fetchSubcategoryReport(
  period: Pick<Period, 'from' | 'to'>,
  categoryId: string,
): Promise<Report> {
  return request(() =>
    reportBySubcategory(periodTransactions(period), categoryId, buildLookups(readDb())),
  );
}

/** `report_by_tag`. */
export function fetchTagReport(
  period: Pick<Period, 'from' | 'to'>,
  type: TransactionType,
): Promise<Report> {
  return request(() => reportByTag(periodTransactions(period), type, buildLookups(readDb())));
}
