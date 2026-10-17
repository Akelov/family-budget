import { Calendar, MessageSquare } from 'lucide-react';

import { addDays } from '@/shared/lib/dates';
import { TextInput } from '@/shared/ui/TextInput';

import { MAX_COMMENT_LENGTH } from '../model/validation';

export interface DateCommentFieldsProps {
  idPrefix: string;
  date: string;
  comment: string;
  today: string;
  dateError?: string | undefined;
  commentError?: string | undefined;
  isReadOnly: boolean;
  onDate: (value: string) => void;
  onComment: (value: string) => void;
  onBlur: (field: 'date' | 'comment') => void;
}

/** Дата (по умолчанию «сегодня», не позже сегодня) с быстрыми кнопками и комментарий (FR-3.2). */
export function DateCommentFields({
  idPrefix,
  date,
  comment,
  today,
  dateError,
  commentError,
  isReadOnly,
  onDate,
  onComment,
  onBlur,
}: DateCommentFieldsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-date`} className="sr-only">
          Дата
        </label>
        <div className="relative">
          <Calendar
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <TextInput
            id={`${idPrefix}-date`}
            type="date"
            value={date}
            max={today}
            readOnly={isReadOnly}
            onChange={(e) => onDate(e.target.value)}
            onBlur={() => onBlur('date')}
            hasError={Boolean(dateError)}
            aria-describedby={dateError ? `${idPrefix}-date-error` : undefined}
            className="pl-10"
          />
        </div>
        {!isReadOnly && (
          <div className="mt-1.5 flex gap-1.5">
            {[
              { label: 'Сегодня', date: today },
              { label: 'Вчера', date: addDays(today, -1) },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => onDate(q.date)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-border aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                aria-pressed={date === q.date}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
        {dateError && (
          <p
            id={`${idPrefix}-date-error`}
            role="alert"
            className="mt-1 text-[13px] text-destructive"
          >
            {dateError}
          </p>
        )}
      </div>
      <div className="relative self-start">
        <label htmlFor={`${idPrefix}-comment`} className="sr-only">
          Комментарий
        </label>
        <MessageSquare
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <TextInput
          id={`${idPrefix}-comment`}
          value={comment}
          readOnly={isReadOnly}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Комментарий"
          onChange={(e) => onComment(e.target.value)}
          onBlur={() => onBlur('comment')}
          hasError={Boolean(commentError)}
          className="pl-10"
        />
      </div>
    </div>
  );
}
