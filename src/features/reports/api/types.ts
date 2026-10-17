import type { ReportRow } from '../model/aggregate';

export interface Report {
  rows: ReportRow[];
  total: number;
}
