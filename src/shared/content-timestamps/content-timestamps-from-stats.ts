import type { Stats } from 'node:fs';

export type ContentTimestamps = {
  modificationTime: Date;
  creationTime: Date;
};

/**
 * Maps local filesystem metadata to the drive server's content-time fields.
 * Uses birthtime when the platform exposes it; otherwise ctime (inode change).
 */
export function contentTimestampsFromStats(stats: Stats): ContentTimestamps {
  const modificationTime = stats.mtime;
  const birthMs = stats.birthtimeMs;
  const hasBirthtime = birthMs > 0 && !Number.isNaN(birthMs);
  const creationTime = hasBirthtime ? stats.birthtime : (stats.ctime ?? stats.mtime);

  return { modificationTime, creationTime };
}
