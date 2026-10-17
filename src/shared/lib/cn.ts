/** Склеивает CSS-классы, пропуская пустые значения: `cn('a', isOn && 'b')`. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
