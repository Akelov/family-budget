import { ApiError } from '@/shared/api/errors';
import { emitChange } from '@/shared/api/events';
import { supabase } from '@/shared/api/supabaseClient';
import { check, unwrap } from '@/shared/api/supabaseErrors';
import { type TagRow, toTag } from '@/shared/api/supabaseRows';
import type { Tag } from '@/shared/types/domain';

export async function fetchTags(): Promise<Tag[]> {
  const rows = unwrap(
    await supabase().from('tags').select('id, name').order('name').overrideTypes<TagRow[], { merge: false }>(),
  );
  return rows.map(toTag);
}

export async function renameTag(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 30) throw new ApiError('validation', 'Название тега — от 1 до 30 символов');
  const rows = unwrap(
    await supabase().from('tags').update({ name: trimmed }).eq('id', id).select('id')
      .overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (rows.length === 0) throw new ApiError('forbidden');
  emitChange(['tags', 'transactions']);
}

/** Удаление тега снимает его с операций (каскад в transaction_tags, FR-6.3). */
export async function deleteTag(id: string): Promise<void> {
  const rows = unwrap(
    await supabase().from('tags').delete().eq('id', id).select('id').overrideTypes<Array<{ id: string }>, { merge: false }>(),
  );
  if (rows.length === 0) throw new ApiError('forbidden');
  emitChange(['tags', 'transactions']);
}

/** Объединение A → B — функция `merge_tags` (несколько таблиц в одной транзакции). */
export async function mergeTags(fromId: string, intoId: string): Promise<void> {
  check(await supabase().rpc('merge_tags', { p_from: fromId, p_into: intoId }));
  emitChange(['tags', 'transactions']);
}
