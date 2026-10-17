import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Задержка поиска после ввода (FR-3.11). */
export const SEARCH_DEBOUNCE_MS = 300;

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** Поле поиска: запрос уходит через 300 мс после последнего нажатия. */
export function SearchField({ value, onChange }: SearchFieldProps) {
  const [text, setText] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Значение из адреса (кнопка «Назад», «Сбросить») важнее набранного.
  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text === value) return undefined;
    const timer = setTimeout(() => onChangeRef.current(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-[17px] -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Поиск"
        aria-label="Поиск по операциям"
        className="h-11 w-full rounded-full bg-card pr-10 pl-10 text-[15px] shadow-card outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={() => {
            setText('');
            onChange('');
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
