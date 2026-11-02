import { describe, expect, it } from 'vitest';
import { contentTimestampsFromStats } from './content-timestamps-from-stats';

describe('contentTimestampsFromStats', () => {
  it('uses mtime for modificationTime and birthtime for creationTime when available', () => {
    const mtime = new Date('2024-01-02T03:04:05.000Z');
    const birthtime = new Date('2023-06-01T12:00:00.000Z');
    const ctime = new Date('2024-01-01T00:00:00.000Z');

    const result = contentTimestampsFromStats({
      mtime,
      birthtime,
      birthtimeMs: birthtime.getTime(),
      ctime,
    } as import('node:fs').Stats);

    expect(result.modificationTime).toEqual(mtime);
    expect(result.creationTime).toEqual(birthtime);
  });

  it('falls back to ctime for creationTime when birthtime is not set', () => {
    const mtime = new Date('2024-01-02T03:04:05.000Z');
    const ctime = new Date('2024-01-01T00:00:00.000Z');

    const result = contentTimestampsFromStats({
      mtime,
      birthtime: new Date(0),
      birthtimeMs: 0,
      ctime,
    } as import('node:fs').Stats);

    expect(result.creationTime).toEqual(ctime);
  });
});
