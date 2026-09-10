import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { createTransientErrorHandler, mapEnvironmentUploadError } from './transient-error-handler';
import { retryWithBackoff } from '../../../shared/retry-with-backoff';
import {
  INITIAL_CONNECTION_TIMEOUT_DELAY_MS,
  INITIAL_PARENT_FOLDER_NOT_FOUND_DELAY_MS,
  INITIAL_RATE_LIMIT_DELAY_MS,
  INITIAL_SERVER_ERROR_DELAY_MS,
  MAX_BACKOFF_MS,
} from './constants';

describe('createTransientErrorHandler', () => {
  it('should return null for non-retryable errors', () => {
    const handler = createTransientErrorHandler({ tag: 'BACKUPS', context: 'TEST', path: '/file.txt' });

    expect(handler(new DriveDesktopError('UNKNOWN'))).toBeNull();
    expect(handler(new DriveDesktopError('NOT_ENOUGH_SPACE'))).toBeNull();
    expect(handler(new DriveDesktopError('FILE_ALREADY_EXISTS'))).toBeNull();
  });

  it('should not retry FILE_TOO_BIG errors', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'TEST', path: '/file.txt' });

    expect(handler(new DriveDesktopError('FILE_TOO_BIG'))).toBeNull();
  });

  it('should return exponential backoff delay for INTERNAL_SERVER_ERROR', () => {
    const handler = createTransientErrorHandler({ tag: 'BACKUPS', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('INTERNAL_SERVER_ERROR');

    expect(handler(error)).toBe(INITIAL_SERVER_ERROR_DELAY_MS * Math.pow(2, 0)); // attempt 1: 1000ms
    expect(handler(error)).toBe(INITIAL_SERVER_ERROR_DELAY_MS * Math.pow(2, 1)); // attempt 2: 2000ms
    expect(handler(error)).toBe(INITIAL_SERVER_ERROR_DELAY_MS * Math.pow(2, 2)); // attempt 3: 4000ms
  });

  it('should cap INTERNAL_SERVER_ERROR delay at MAX_BACKOFF_MS', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('INTERNAL_SERVER_ERROR');

    // base=1000, cap=480000 → attempt 9: 256000ms, attempt 10: 512000ms → capped
    for (let i = 0; i < 9; i++) handler(error);

    expect(handler(error)).toBe(MAX_BACKOFF_MS);
  });

  it('should use retry_after from RATE_LIMITED message as base delay', () => {
    const retryAfterMs = 60_000;
    const handler = createTransientErrorHandler({ tag: 'BACKUPS', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('RATE_LIMITED', String(retryAfterMs));

    expect(handler(error)).toBe(retryAfterMs * Math.pow(2, 0)); // attempt 1: 60000ms
  });

  it('should fall back to INITIAL_RATE_LIMIT_DELAY_MS when RATE_LIMITED message is not a number', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('RATE_LIMITED', 'not-a-number');

    expect(handler(error)).toBe(INITIAL_RATE_LIMIT_DELAY_MS);
  });

  it('should apply exponential backoff across multiple RATE_LIMITED retries', () => {
    const retryAfterMs = 10_000;
    const handler = createTransientErrorHandler({ tag: 'BACKUPS', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('RATE_LIMITED', String(retryAfterMs));

    expect(handler(error)).toBe(retryAfterMs * Math.pow(2, 0)); // attempt 1: 10000ms
    expect(handler(error)).toBe(retryAfterMs * Math.pow(2, 1)); // attempt 2: 20000ms
  });

  it('should share attempt counter between RATE_LIMITED and INTERNAL_SERVER_ERROR', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'TEST', path: '/file.txt' });

    handler(new DriveDesktopError('INTERNAL_SERVER_ERROR')); // attempt 1, base=1000 → 1000ms
    const delay = handler(new DriveDesktopError('RATE_LIMITED', String(INITIAL_RATE_LIMIT_DELAY_MS))); // attempt 2, base=30000 → 60000ms

    expect(delay).toBe(INITIAL_RATE_LIMIT_DELAY_MS * Math.pow(2, 1));
  });

  it('should create independent state per handler instance', () => {
    const handler1 = createTransientErrorHandler({ tag: 'BACKUPS', context: 'TEST', path: '/file1.txt' });
    const handler2 = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'TEST', path: '/file2.txt' });
    const error = new DriveDesktopError('INTERNAL_SERVER_ERROR');

    handler1(error); // advance handler1 to attempt 1
    handler1(error); // advance handler1 to attempt 2

    // handler2 should start fresh at attempt 1
    expect(handler2(error)).toBe(INITIAL_SERVER_ERROR_DELAY_MS);
  });

  it('should retry CONNECTION_TIMEOUT errors like rate-limited errors', () => {
    const handler = createTransientErrorHandler({ tag: 'BACKUPS', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('CONNECTION_TIMEOUT');

    expect(handler(error)).toBe(INITIAL_CONNECTION_TIMEOUT_DELAY_MS);
    expect(handler(error)).toBe(INITIAL_CONNECTION_TIMEOUT_DELAY_MS * 2);
  });

  it('should retry NETWORK_ERROR errors like server errors', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('NETWORK_ERROR');

    expect(handler(error)).toBe(INITIAL_SERVER_ERROR_DELAY_MS);
    expect(handler(error)).toBe(INITIAL_SERVER_ERROR_DELAY_MS * 2);
  });

  it('should retry PARENT_FOLDER_NOT_FOUND with server base delay', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'TEST', path: '/file.txt' });
    const error = new DriveDesktopError('PARENT_FOLDER_NOT_FOUND');

    expect(handler(error)).toBe(INITIAL_PARENT_FOLDER_NOT_FOUND_DELAY_MS);
    expect(handler(error)).toBe(INITIAL_PARENT_FOLDER_NOT_FOUND_DELAY_MS * 2);
  });
});

describe('mapEnvironmentUploadError', () => {
  it('should map S3 RequestTimeout XML payload to CONNECTION_TIMEOUT with explicit S3 marker', () => {
    const error = new Error(
      'Failed to upload part: 400 <?xml version="1.0" encoding="UTF-8"?><Error><Code>RequestTimeout</Code><Message>Your socket connection to the server was not read from or written to within the timeout period.</Message></Error>',
    );

    const result = mapEnvironmentUploadError(error);

    expect(result.cause).toBe('CONNECTION_TIMEOUT');
    expect(result.message).toBe(`[S3_REQUEST_TIMEOUT] ${error.message}`);
  });

  it('should map S3 timeout-period message to CONNECTION_TIMEOUT with explicit S3 marker', () => {
    const error = new Error(
      'Failed to upload part: 400 Your socket connection to the server was not read from or written to within the timeout period.',
    );

    const result = mapEnvironmentUploadError(error);

    expect(result.cause).toBe('CONNECTION_TIMEOUT');
    expect(result.message).toBe(`[S3_REQUEST_TIMEOUT] ${error.message}`);
  });

  it('should map connect timeout message to CONNECTION_TIMEOUT so it retries explicitly', () => {
    const error = new Error('Connect Timeout Error (attempted addresses: 141.95.161.76:443, timeout: 10000ms)');

    const result = mapEnvironmentUploadError(error);

    expect(result.cause).toBe('CONNECTION_TIMEOUT');
    expect(result.message).toBe(error.message);
  });

  it('should map connect timeout code to CONNECTION_TIMEOUT so it retries explicitly', () => {
    const error = Object.assign(new Error('socket connect timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' });

    const result = mapEnvironmentUploadError(error);

    expect(result.cause).toBe('CONNECTION_TIMEOUT');
    expect(result.message).toBe(error.message);
  });

  it('should map undici socket close errors to CONNECTION_TIMEOUT so upload retries explicitly', () => {
    const error = Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' });

    const result = mapEnvironmentUploadError(error);

    expect(result.cause).toBe('CONNECTION_TIMEOUT');
    expect(result.message).toBe(error.message);
  });

  it('should map undici headers timeout code to CONNECTION_TIMEOUT so upload retries explicitly', () => {
    const error = Object.assign(new Error('Headers Timeout Error'), { code: 'UND_ERR_HEADERS_TIMEOUT' });

    const result = mapEnvironmentUploadError(error);

    expect(result.cause).toBe('CONNECTION_TIMEOUT');
    expect(result.message).toBe(error.message);
  });

  it('should map headers timeout message to CONNECTION_TIMEOUT so upload retries explicitly', () => {
    const error = new Error('Headers Timeout Error');

    const result = mapEnvironmentUploadError(error);

    expect(result.cause).toBe('CONNECTION_TIMEOUT');
    expect(result.message).toBe(error.message);
  });
});

describe('mapEnvironmentUploadError, for the shapes inxt-js actually throws', () => {
  it('retries a 500 reported by the single-shot upload', () => {
    const error = mapEnvironmentUploadError(new Error('Failed to upload file: 500 internal error'));

    expect(error.cause).toBe('INTERNAL_SERVER_ERROR');
  });

  it('retries a 503 reported by the multipart upload', () => {
    const error = mapEnvironmentUploadError(new Error('Failed to upload part: 503 unavailable'));

    expect(error.cause).toBe('INTERNAL_SERVER_ERROR');
  });

  it('rate-limits a 429 reported the same way, at the default delay', () => {
    const error = mapEnvironmentUploadError(new Error('Failed to upload file: 429 {"retry_after":2}'));

    expect(error.cause).toBe('RATE_LIMITED');
    expect(error.message).toBe(String(INITIAL_RATE_LIMIT_DELAY_MS));
  });

  it('leaves a 4xx that is not 429 alone, so it is not retried forever', () => {
    const error = mapEnvironmentUploadError(new Error('Failed to upload file: 403 forbidden'));

    expect(error.cause).toBe('UNKNOWN');
  });

  it('still prefers an explicit status property when the error carries one', () => {
    const error = mapEnvironmentUploadError(Object.assign(new Error('anything'), { status: 500 }));

    expect(error.cause).toBe('INTERNAL_SERVER_ERROR');
  });

  it('does not read a status out of an unrelated message that contains digits', () => {
    const error = mapEnvironmentUploadError(new Error('Could not open /home/user/500 photos/x.jpg'));

    expect(error.cause).toBe('UNKNOWN');
  });

  it('does not treat a longer number as a status', () => {
    const error = mapEnvironmentUploadError(new Error('Failed to upload file: 5000 bytes missing'));

    expect(error.cause).toBe('UNKNOWN');
  });
});

describe('and the retry loop those classifications feed', () => {
  const inxtServerError = new Error('Failed to upload file: 500 internal error');

  it('asks the caller to wait rather than giving up, for an inxt-js 5xx', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'test', path: '/x' });

    expect(handler(mapEnvironmentUploadError(inxtServerError))).toBeTypeOf('number');
  });

  it('still gives up on a 403, so it is not retried forever', () => {
    const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'test', path: '/x' });
    const forbidden = new Error('Failed to upload file: 403 forbidden');

    expect(handler(mapEnvironmentUploadError(forbidden))).toBeNull();
  });

  it('actually runs the upload again and succeeds on the retry', async () => {
    vi.useFakeTimers();

    try {
      const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'test', path: '/x' });
      const attempt = vi
        .fn()
        .mockResolvedValueOnce({ error: mapEnvironmentUploadError(inxtServerError) })
        .mockResolvedValueOnce({ data: 'contents-id' });

      const promise = retryWithBackoff(attempt, handler, new AbortController().signal);
      await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS);

      await expect(promise).resolves.toEqual({ data: 'contents-id' });
      expect(attempt).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops retrying when the upload is aborted, so it cannot loop forever', async () => {
    vi.useFakeTimers();

    try {
      const handler = createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'test', path: '/x' });
      const controller = new AbortController();
      const attempt = vi.fn().mockResolvedValue({ error: mapEnvironmentUploadError(inxtServerError) });

      const promise = retryWithBackoff(attempt, handler, controller.signal);
      await vi.advanceTimersByTimeAsync(2_000);
      controller.abort();
      await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS);

      await expect(promise).resolves.toMatchObject({ error: { cause: 'ABORTED' } });
    } finally {
      vi.useRealTimers();
    }
  });
});

it('does not retry an impossible status', () => {
  expect(mapEnvironmentUploadError(new Error('Failed to upload file: 700 nonsense')).cause).toBe('UNKNOWN');
});