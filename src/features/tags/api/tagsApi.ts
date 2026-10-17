import { isSupabaseEnabled } from '@/shared/api/config';

import * as mock from './tagsApi.mock';
import * as remote from './tagsApi.supabase';

/** API тегов: Supabase или мок-сервер — выбирается при запуске. */
const api = isSupabaseEnabled ? remote : mock;

export const fetchTags = api.fetchTags;
export const renameTag = api.renameTag;
export const deleteTag = api.deleteTag;
export const mergeTags = api.mergeTags;
