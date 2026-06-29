/**
 * 2MB default blocks — lower latency on slow links while preserving cache locality.
 * Each block is downloaded in full on first access regardless of how small the FUSE read is,
 * so subsequent reads within the same block are served from disk.
 */
const DEFAULT_BLOCK_SIZE_MB = 2;
const ALLOWED_BLOCK_SIZE_MB = new Set([1, 2, 4, 8]);

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

export const BLOCK_SIZE = getConfiguredBlockSizeInMb() * 1024 * 1024;
export const BITS_PER_BYTE = 8;
