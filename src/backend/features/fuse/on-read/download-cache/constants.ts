/**
 * 4MB default blocks — lower latency on slow links while preserving cache locality.
 * Each block is downloaded in full on first access regardless of how small the FUSE read is,
 * so subsequent reads within the same block are served from disk.
 */
const DEFAULT_BLOCK_SIZE_MB = 4;
export const PREFETCH_BLOCKS_AHEAD = 3;

export const BLOCK_SIZE = DEFAULT_BLOCK_SIZE_MB * 1024 * 1024;
export const BITS_PER_BYTE = 8;
