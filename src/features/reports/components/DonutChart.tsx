import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { formatMoney } from '@/shared/lib/money';
import { CATEGORY_HEX } from '@/shared/ui/categoryPalette';

import type { ReportRow } from '../model/aggregate';

export interface DonutChartProps {
  rows: ReportRow[];
  total: number;
  caption: string;
}

/** Кольцевая диаграмма с итогом в центре (FR-4.2). Подписи и проценты — в списке рядом. */
export function DonutChart({ rows, total, caption }: DonutChartProps) {
  return (
    <figure
      className="relative mx-auto aspect-square w-full max-w-[260px]"
      aria-label={`${caption}: ${formatMoney(total)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="amount"
            nameKey="name"
            innerRadius="72%"
            outerRadius="100%"
            paddingAngle={rows.length > 1 ? 1.5 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell key={row.id} fill={CATEGORY_HEX[row.color]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <figcaption className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-muted-foreground">{caption}</span>
        <span className="num text-xl font-bold sm:text-[22px]">{formatMoney(total)}</span>
      </figcaption>
    </figure>
  );
}
