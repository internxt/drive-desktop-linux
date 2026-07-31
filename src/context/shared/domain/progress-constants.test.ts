import { PROGRESS_UPDATE_INTERVAL_MS, shouldEmitProgress } from './progress-constants';

describe('progress constants', () => {
  it('defines the shared progress update interval', () => {
    expect(PROGRESS_UPDATE_INTERVAL_MS).toBe(250);
  });

  it('throttles updates until the interval elapses or the transfer finishes', () => {
    const state = { lastUpdateAt: 900 };

    const result = shouldEmitProgress({
      bytesProcessed: 10,
      intervalMs: 250,
      now: 1_000,
      state,
      totalBytes: 100,
    });

    expect(result).toBe(false);
    expect(state.lastUpdateAt).toBe(900);
  });

  it('emits the final update even when the interval has not elapsed', () => {
    const state = { lastUpdateAt: 900 };

    const result = shouldEmitProgress({
      bytesProcessed: 100,
      intervalMs: 250,
      now: 1_000,
      state,
      totalBytes: 100,
    });

    expect(result).toBe(true);
    expect(state.lastUpdateAt).toBe(1_000);
  });
});
