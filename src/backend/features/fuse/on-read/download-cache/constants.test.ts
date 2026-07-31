import { BLOCK_SIZE, PREFETCH_BLOCKS_AHEAD } from './constants';

describe('download cache constants', () => {
  const originalDownloadBlockSizeEnv = process.env.INTERNXT_DRIVE_DOWNLOAD_BLOCK_SIZE_MB;
  const originalPrefetchEnv = process.env.INTERNXT_DRIVE_READ_PREFETCH_BLOCKS_AHEAD;

  afterEach(() => {
    if (originalDownloadBlockSizeEnv === undefined) {
      delete process.env.INTERNXT_DRIVE_DOWNLOAD_BLOCK_SIZE_MB;
    } else {
      process.env.INTERNXT_DRIVE_DOWNLOAD_BLOCK_SIZE_MB = originalDownloadBlockSizeEnv;
    }

    if (originalPrefetchEnv === undefined) {
      delete process.env.INTERNXT_DRIVE_READ_PREFETCH_BLOCKS_AHEAD;
    } else {
      process.env.INTERNXT_DRIVE_READ_PREFETCH_BLOCKS_AHEAD = originalPrefetchEnv;
    }
  });

  it('ignores environment overrides and keeps the built-in defaults', () => {
    process.env.INTERNXT_DRIVE_DOWNLOAD_BLOCK_SIZE_MB = '8';
    process.env.INTERNXT_DRIVE_READ_PREFETCH_BLOCKS_AHEAD = '8';

    expect(BLOCK_SIZE).toBe(4 * 1024 * 1024);
    expect(PREFETCH_BLOCKS_AHEAD).toBe(5);
  });
});
