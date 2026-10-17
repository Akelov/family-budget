/** Длина пути возврата, после которой он считается подозрительным. */
const MAX_REDIRECT_LENGTH = 300;

/**
 * Путь, куда вернуть пользователя после входа (параметр `?next=`), — только внутри сайта.
 * Защита от «открытого редиректа» (OWASP A01): ссылка вида `/login?next=https://evil.example`
 * не должна после входа уводить на чужой сайт.
 *
 * Краевые случаи: `//evil.example` и `/\evil.example` браузер понимает как адрес другого сайта;
 * управляющие символы и слишком длинные строки отбрасываются.
 *
 * @param next - значение параметра `next` из адреса (может быть `null`)
 * @returns безопасный путь внутри сайта или `/`
 */
export function safeRedirectPath(next: string | null): string {
  if (!next || next.length > MAX_REDIRECT_LENGTH) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//') || next.includes('\\')) return '/';
  // eslint-disable-next-line no-control-regex -- ищем именно управляющие символы
  if (/[\u0000-\u001f\u007f]/.test(next)) return '/';
  return next;
}
