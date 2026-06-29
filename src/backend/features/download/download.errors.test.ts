import { mapDownloadError } from './download.errors';

describe('download.errors', () => {
  it('should map 429 errors to rate limited', () => {
    // When
    const result = mapDownloadError({ status: 429, message: 'retry-after: 1200' });

    // Then
    expect(result.cause).toBe('RATE_LIMITED');
  });

  it('should map server errors to internal server error', () => {
    // When
    const result = mapDownloadError({ response: { status: 502 }, message: 'bad gateway' });

    // Then
    expect(result.cause).toBe('INTERNAL_SERVER_ERROR');
    expect(result.message).toBe('bad gateway');
  });

  it('should map unknown errors to unknown cause', () => {
    // When
    const result = mapDownloadError({ message: 'something odd' });

    // Then
    expect(result.cause).toBe('UNKNOWN');
  });
});
