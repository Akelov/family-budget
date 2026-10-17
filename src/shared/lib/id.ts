/**
 * Новый UUID для сущности. Операции получают id на клиенте при открытии формы (FR-3.4),
 * чтобы повтор сохранения не создавал дубликат.
 */
export function createId(): string {
  return crypto.randomUUID();
}
