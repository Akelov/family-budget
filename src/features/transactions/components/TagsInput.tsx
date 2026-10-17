import { Tag as TagIcon, X } from 'lucide-react';
import { type KeyboardEvent, useId, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { normalizeName } from '@/shared/lib/text';
import type { Tag } from '@/shared/types/domain';

import { MAX_TAG_LENGTH, MAX_TAGS_PER_TRANSACTION } from '../model/validation';

export interface TagsInputProps {
  id: string;
  value: string[];
  allTags: Tag[];
  onChange: (tags: string[]) => void;
  onBlur: () => void;
  error?: string | undefined;
  isDisabled?: boolean;
}

/**
 * Поле тегов с автодополнением (FR-6.1, FR-6.2): совпадение без учёта регистра подставляет
 * существующий тег, иначе создаётся новый. Enter или запятая добавляют тег.
 */
export function TagsInput({
  id,
  value,
  allTags,
  onChange,
  onBlur,
  error,
  isDisabled = false,
}: TagsInputProps) {
  const [text, setText] = useState('');
  const listId = useId();
  const needle = normalizeName(text);
  const chosen = new Set(value.map(normalizeName));
  const suggestions = allTags
    .filter(
      (t) =>
        !chosen.has(normalizeName(t.name)) &&
        (needle === '' || normalizeName(t.name).includes(needle)),
    )
    .slice(0, 6);
  const isFull = value.length >= MAX_TAGS_PER_TRANSACTION;

  function add(name: string) {
    const trimmed = name.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed) return;
    const existing = allTags.find((t) => normalizeName(t.name) === normalizeName(trimmed));
    const finalName = existing?.name ?? trimmed;
    if (!chosen.has(normalizeName(finalName))) onChange([...value, finalName]);
    setText('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(text);
    } else if (event.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <div
        className={cn(
          'flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border bg-white px-3 py-2 focus-within:border-primary',
          error ? 'border-destructive' : 'border-border',
        )}
      >
        <TagIcon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent py-1 pr-1 pl-3 text-[13px] font-medium text-accent-foreground"
          >
            <span className="truncate">{name}</span>
            {!isDisabled && (
              <button
                type="button"
                aria-label={`Убрать тег ${name}`}
                onClick={() => onChange(value.filter((v) => v !== name))}
                className="grid size-5 place-items-center rounded-full hover:bg-white/60"
              >
                <X className="size-3.5" />
              </button>
            )}
          </span>
        ))}
        {!isDisabled && (
          <input
            id={id}
            value={text}
            disabled={isFull}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              add(text);
              onBlur();
            }}
            placeholder={isFull ? 'Достигнут предел тегов' : 'Добавить тег…'}
            maxLength={MAX_TAG_LENGTH}
            aria-label="Теги"
            aria-describedby={error ? `${id}-error` : listId}
            className="h-8 min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>
      {!isDisabled && !isFull && suggestions.length > 0 && (
        <div id={listId} className="mt-2 flex flex-wrap gap-1.5" aria-label="Подсказки тегов">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(tag.name)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {tag.name}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
