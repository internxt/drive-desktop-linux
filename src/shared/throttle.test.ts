import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { throttle } from './throttle';

describe('throttle', () => {
  const mockFn = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call the function immediately on first invocation', () => {
    const throttled = throttle(mockFn, 1000);

    throttled();

    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should not call the function again within the delay', () => {
    const throttled = throttle(mockFn, 1000);

    throttled();
    throttled();
    throttled();

    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should call the function again after the delay has passed', () => {
    const throttled = throttle(mockFn, 1000);

    throttled();
    vi.advanceTimersByTime(1000);
    throttled();

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should ignore calls within the delay window', () => {
    const throttled = throttle(mockFn, 1000);

    throttled();
    vi.advanceTimersByTime(500);
    throttled();
    vi.advanceTimersByTime(499);
    throttled();

    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should allow a call right at the delay boundary', () => {
    const throttled = throttle(mockFn, 1000);

    throttled();
    vi.advanceTimersByTime(1000);
    throttled();
    vi.advanceTimersByTime(1000);
    throttled();

    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});
