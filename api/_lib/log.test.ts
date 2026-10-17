import { describe, expect, it } from 'vitest';

import { formatServerLog } from './log';

describe('formatServerLog', () => {
  it('одна JSON-строка с уровнем, временем, источником и событием', () => {
    const line = formatServerLog(
      'warning',
      'api/health',
      'health_check',
      { status: 'degraded' },
      new Date('2026-10-18T00:00:00Z'),
    );
    expect(JSON.parse(line)).toEqual({
      level: 'warning',
      time: '2026-10-18T00:00:00.000Z',
      source: 'api/health',
      event: 'health_check',
      status: 'degraded',
    });
    expect(line).not.toContain('\n');
  });

  it('поля из data не могут подменить уровень и источник', () => {
    const line = formatServerLog('info', 'api/health', 'x', { level: 'error', source: 'evil' });
    expect(JSON.parse(line)).toMatchObject({ level: 'info', source: 'api/health' });
  });
});
