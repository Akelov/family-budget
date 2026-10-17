import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { saveErrorKind } from './saveError';

describe('saveErrorKind', () => {
  it('разделяет конфликт, удаление, сетевые и прочие ошибки', () => {
    expect(saveErrorKind(new ApiError('conflict'))).toBe('conflict');
    expect(saveErrorKind(new ApiError('not_found'))).toBe('not_found');
    expect(saveErrorKind(new ApiError('network'))).toBe('retryable');
    expect(saveErrorKind(new ApiError('server'))).toBe('retryable');
    expect(saveErrorKind(new ApiError('forbidden'))).toBe('other');
    expect(saveErrorKind(new Error('boom'))).toBe('other');
  });
});
