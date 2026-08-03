import { shouldEmitProgress, type ProgressReporterState } from './should-emit-progress';

describe('should-emit-progress', () => {
  let state: ProgressReporterState;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    state = { lastUpdateAt: 0 };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should emit when enough time has elapsed since the last update', () => {
    state.lastUpdateAt = Date.now() - 300;

    const result = shouldEmitProgress({
      bytesDownloaded: 10,
      fileSize: 100,
      state,
    });

    expect(result).toBe(true);
    expect(state.lastUpdateAt).toBe(Date.now());
  });

  it('should not emit when the interval has not elapsed and download is not finished', () => {
    state.lastUpdateAt = Date.now() - 100;

    const result = shouldEmitProgress({
      bytesDownloaded: 10,
      fileSize: 100,
      state,
    });

    expect(result).toBe(false);
    expect(state.lastUpdateAt).toBe(Date.now() - 100);
  });

  it('should emit the final update even when the interval has not elapsed', () => {
    state.lastUpdateAt = Date.now() - 100;

    const result = shouldEmitProgress({
      bytesDownloaded: 100,
      fileSize: 100,
      state,
    });

    expect(result).toBe(true);
    expect(state.lastUpdateAt).toBe(Date.now());
  });
});
