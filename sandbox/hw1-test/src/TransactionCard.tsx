import type { Transaction } from './types';
import { formatShortDate, formatSignedAmount } from './format';

interface TransactionCardProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
}

/** Карточка одной операции в ленте семейного бюджета */
export function TransactionCard({ transaction, onDelete }: TransactionCardProps) {
  const { id, type, amount, category, author, date, comment } = transaction;

  return (
    <article className={`tx-card tx-card--${type}`} data-testid="transaction-card">
      <div className="tx-card__main">
        <span className="tx-card__category">{category}</span>
        {comment && <span className="tx-card__comment">{comment}</span>}
        <span className="tx-card__meta">
          {author} · {formatShortDate(date)}
        </span>
      </div>
      <div className="tx-card__side">
        <span className="tx-card__amount" data-testid="transaction-amount">
          {formatSignedAmount(amount, type)}
        </span>
        {onDelete && (
          <button
            type="button"
            className="tx-card__delete"
            aria-label={`Удалить операцию «${category}»`}
            onClick={() => onDelete(id)}
          >
            ×
          </button>
        )}
      </div>
    </article>
  );
}
