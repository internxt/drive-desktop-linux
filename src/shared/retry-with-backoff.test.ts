import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff } from './retry-with-backoff';
import { DriveDesktopError } from '../context/shared/domain/errors/DriveDesktopError';

describe('retry-with-backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return data immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue({ data: 'ok' });
    const controller = new AbortController();

    const result = await retryWithBackoff(fn, () => null, controller.signal);

    expect(result).toStrictEqual({ data: 'ok' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry when onError returns a delay', async () => {
    const error = new DriveDesktopError('UNKNOWN');
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ error })
      .mockResolvedValueOnce({ error })
      .mockResolvedValue({ data: 'ok' });
    const controller = new AbortController();

    const promise = retryWithBackoff(fn, () => 100, controller.signal);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toStrictEqual({ data: 'ok' });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should stop retrying when onError returns null', async () => {
    const error = new DriveDesktopError('BAD_RESPONSE');
    const fn = vi.fn().mockResolvedValue({ error });
    const controller = new AbortController();

    const result = await retryWithBackoff(fn, () => null, controller.signal);

    expect(result).toStrictEqual({ error });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should return ABORTED error when signal is aborted before first attempt', async () => {
    const fn = vi.fn().mockResolvedValue({ data: 'ok' });
    const controller = new AbortController();
    controller.abort();

    const result = await retryWithBackoff(fn, () => null, controller.signal);

    expect(result.error?.cause).toBe('ABORTED');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should exit sleep early and returns ABORTED when signal is aborted during delay', async () => {
    const error = new DriveDesktopError('UNKNOWN');
    const fn = vi.fn().mockResolvedValueOnce({ error }).mockResolvedValue({ data: 'ok' });
    const controller = new AbortController();

    const promise = retryWithBackoff(fn, () => 10_000, controller.signal);

    // Abort while sleeping
    controller.abort();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error?.cause).toBe('ABORTED');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
