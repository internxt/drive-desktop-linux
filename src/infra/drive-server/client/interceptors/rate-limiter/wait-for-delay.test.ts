import { waitForDelay } from './wait-for-delay';

describe('waitForDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should clear the pending state after the delay resolves', async () => {
    const state = { pendingByKey: {} };

    const promise = waitForDelay(state, 'GET:/test', 100);
    expect(state.pendingByKey['GET:/test']).not.toBeNull();

    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(state.pendingByKey['GET:/test']).toBeUndefined();
  });

  it('should share the same delay for concurrent callers instead of creating separate ones', async () => {
    const state = { pendingByKey: {} };

    const first = waitForDelay(state, 'GET:/test', 1000);
    const pendingPromise = state.pendingByKey['GET:/test'];

    const second = waitForDelay(state, 'GET:/test', 1000);
    const third = waitForDelay(state, 'GET:/test', 1000);

    expect(state.pendingByKey['GET:/test']).toBe(pendingPromise);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all([first, second, third]);

    expect(state.pendingByKey['GET:/test']).toBeUndefined();
  });
});
