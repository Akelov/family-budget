import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installGlobalErrorLogging } from './globalErrors';
import { resetLogLimit } from './logger';

function loggedCodes(spy: ReturnType<typeof vi.spyOn>): unknown[] {
  return spy.mock.calls.map((call) => (JSON.parse(String(call[0])) as { code: unknown }).code);
}

describe('installGlobalErrorLogging', () => {
  const target = new EventTarget();
  let uninstall: () => void = () => undefined;

  beforeEach(() => {
    resetLogLimit();
    uninstall = installGlobalErrorLogging(target);
  });
  afterEach(() => {
    uninstall();
    vi.restoreAllMocks();
  });

  it('логирует непойманное исключение', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    target.dispatchEvent(new ErrorEvent('error', { message: 'Boom' }));
    expect(loggedCodes(spy)).toEqual(['uncaught']);
  });

  it('логирует отклонённый промис без catch, причина — не Error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const event = Object.assign(new Event('unhandledrejection'), { reason: 'таймаут' });
    target.dispatchEvent(event);
    expect(loggedCodes(spy)).toEqual(['unhandled_rejection']);
    expect(String(spy.mock.calls[0]?.[0])).toContain('таймаут');
  });

  it('после отключения больше ничего не пишет', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    uninstall();
    target.dispatchEvent(new ErrorEvent('error', { message: 'Boom' }));
    expect(spy).not.toHaveBeenCalled();
  });
});
