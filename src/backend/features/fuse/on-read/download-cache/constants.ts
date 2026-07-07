/**
 * 4MB default blocks — lower latency on slow links while preserving cache locality.
 * Each block is downloaded in full on first access regardless of how small the FUSE read is,
 * so subsequent reads within the same block are served from disk.
 */
const DEFAULT_BLOCK_SIZE_MB = 4;
const ALLOWED_BLOCK_SIZE_MB = new Set([1, 2, 4, 8]);
const PREFETCH_DEFAULT_BLOCKS_AHEAD = 5;
const PREFETCH_MAX_BLOCKS_AHEAD = 8;

function getConfiguredBlockSizeInMb() {
  const configuredValue = process.env.INTERNXT_DRIVE_DOWNLOAD_BLOCK_SIZE_MB;

  if (!configuredValue) {
    return DEFAULT_BLOCK_SIZE_MB;
  }

  const parsedValue = Number.parseInt(configuredValue, 10);
  if (!ALLOWED_BLOCK_SIZE_MB.has(parsedValue)) {
    return DEFAULT_BLOCK_SIZE_MB;
  }

  return parsedValue;
}

function getPrefetchBlocksAhead({ configuredValue }: { configuredValue: string | undefined }) {
  if (!configuredValue) {
    return PREFETCH_DEFAULT_BLOCKS_AHEAD;
  }

  const parsed = Number.parseInt(configuredValue, 10);
  if (Number.isNaN(parsed)) {
    return PREFETCH_DEFAULT_BLOCKS_AHEAD;
  }

  return Math.max(0, Math.min(parsed, PREFETCH_MAX_BLOCKS_AHEAD));
}

export function getReadPrefetchBlocksAhead() {
  return getPrefetchBlocksAhead({
    configuredValue: process.env.INTERNXT_DRIVE_READ_PREFETCH_BLOCKS_AHEAD,
  });
}

export const BLOCK_SIZE = getConfiguredBlockSizeInMb() * 1024 * 1024;
export const BITS_PER_BYTE = 8;
