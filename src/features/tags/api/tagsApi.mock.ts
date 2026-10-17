import { can } from '@/features/household/model/permissions';
import { ApiError } from '@/shared/api/errors';
import { currentMember, readDb, request, writeDb } from '@/shared/api/mockDb';
import { normalizeName } from '@/shared/lib/text';
import type { Tag } from '@/shared/types/domain';

function assertCanManage(): void {
  if (!can(currentMember(readDb()).role, 'tags.manage')) throw new ApiError('forbidden');
}

export function fetchTags(): Promise<Tag[]> {
  return request(() => [...readDb().tags].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
}

export function renameTag(id: string, name: string): Promise<void> {
  return request(() => {
    assertCanManage();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 30)
      throw new ApiError('validation', 'Название тега — от 1 до 30 символов');
    if (
      readDb().tags.some((t) => t.id !== id && normalizeName(t.name) === normalizeName(trimmed))
    ) {
      throw new ApiError('duplicate', 'Такой тег уже есть');
    }
    writeDb(['tags', 'transactions'], (d) => ({
      ...d,
      tags: d.tags.map((t) => (t.id === id ? { ...t, name: trimmed } : t)),
    }));
  });
}

/** Удаление тега снимает его со всех операций (FR-6.3). */
export function deleteTag(id: string): Promise<void> {
  return request(() => {
    assertCanManage();
    writeDb(['tags', 'transactions'], (d) => ({
      ...d,
      tags: d.tags.filter((t) => t.id !== id),
      transactions: d.transactions.map((tx) =>
        tx.tagIds.includes(id) ? { ...tx, tagIds: tx.tagIds.filter((t) => t !== id) } : tx,
      ),
    }));
  });
}

/** Объединение A → B: операции с A получают B без дубликатов, A удаляется (FR-6.3). */
export function mergeTags(fromId: string, intoId: string): Promise<void> {
  return request(() => {
    assertCanManage();
    if (fromId === intoId) throw new ApiError('validation', 'Выберите другой тег');
    writeDb(['tags', 'transactions'], (d) => ({
      ...d,
      tags: d.tags.filter((t) => t.id !== fromId),
      transactions: d.transactions.map((tx) =>
        tx.tagIds.includes(fromId)
          ? { ...tx, tagIds: [...new Set(tx.tagIds.map((t) => (t === fromId ? intoId : t)))] }
          : tx,
      ),
    }));
  });
}
