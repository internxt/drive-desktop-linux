import * as downloadFileWithVersionFallbackModule from './download-file-with-version-fallback';
import * as downloadErrorsModule from './download.errors';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { runDownloadAttempt } from './run-download-attempt';

describe('run-download-attempt', () => {
  const downloadFileWithVersionFallbackMock = partialSpyOn(
    downloadFileWithVersionFallbackModule,
    'downloadFileWithVersionFallback',
  );
  const mapDownloadErrorMock = partialSpyOn(downloadErrorsModule, 'mapDownloadError');

  it('should return data when fallback succeeds', async () => {
    // Given
    const stream = new ReadableStream<Uint8Array>();
    downloadFileWithVersionFallbackMock.mockResolvedValue(stream);
    const state: { lastError?: unknown } = {};

    // When
    const result = await runDownloadAttempt({
      params: {
        networkApiUrl: 'https://api',
        bucketId: 'bucket-id',
        fileId: 'file-id',
        options: { notifyProgress: vi.fn() },
      },
      state,
    });

    // Then
    expect(result).toStrictEqual({ data: stream });
  });

  it('should map error and keep last error when fallback fails', async () => {
    // Given
    const error = new Error('boom');
    const mapped = { cause: 'UNKNOWN' };
    downloadFileWithVersionFallbackMock.mockRejectedValue(error);
    mapDownloadErrorMock.mockReturnValue(mapped);
    const state: { lastError?: unknown } = {};

    // When
    const result = await runDownloadAttempt({
      params: {
        networkApiUrl: 'https://api',
        bucketId: 'bucket-id',
        fileId: 'file-id',
        options: { notifyProgress: vi.fn() },
      },
      state,
    });

    // Then
    expect(state.lastError).toBe(error);
    expect(result).toStrictEqual({ error: mapped });
  });
});
