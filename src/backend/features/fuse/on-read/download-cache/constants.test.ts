import { BLOCK_SIZE, PREFETCH_BLOCKS_AHEAD } from './constants';

describe('download cache constants', () => {
  it('keeps the built-in defaults', () => {
    expect(BLOCK_SIZE).toBe(4 * 1024 * 1024);
    expect(PREFETCH_BLOCKS_AHEAD).toBe(3);
  });
});
