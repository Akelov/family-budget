import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';
import type { Transaction } from '@/shared/types/domain';

import { signedAmount } from '../model/summary';

export interface TransactionAmountProps {
  transaction: Pick<Transaction, 'type' | 'amount'>;
  className?: string;
}

/** Сумма операции: расход «−2 500 ₽» красным, доход «+95 000 ₽» зелёным (NFR-G6). */
export function TransactionAmount({ transaction, className }: TransactionAmountProps) {
  return (
    <span
      className={cn(
        'num font-semibold',
        transaction.type === 'income' ? 'text-primary' : 'text-destructive',
        className,
      )}
    >
      {formatMoney(signedAmount(transaction), { sign: 'always' })}
    </span>
  );
}
