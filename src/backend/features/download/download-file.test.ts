import * as transientErrorHandlerModule from '../../common/rate-limit/transient-error-handler';
import * as retryWithBackoffModule from '../../../shared/retry-with-backoff';
import * as runDownloadAttemptModule from './run-download-attempt';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { downloadFile } from './download-file';

describe('download-file', () => {
  const createTransientErrorHandlerMock = partialSpyOn(transientErrorHandlerModule, 'createTransientErrorHandler');
  const retryWithBackoffMock = partialSpyOn(retryWithBackoffModule, 'retryWithBackoff');
  const runDownloadAttemptMock = partialSpyOn(runDownloadAttemptModule, 'runDownloadAttempt');

  it('should return data when retry succeeds', async () => {
    // Given
    const stream = new ReadableStream<Uint8Array>();
    createTransientErrorHandlerMock.mockReturnValue(vi.fn());
    retryWithBackoffMock.mockResolvedValue({ data: stream });

    // When
    const result = await downloadFile({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      options: { notifyProgress: vi.fn() },
    });

    // Then
    expect(result).toBe(stream);
    expect(retryWithBackoffMock).toHaveBeenCalledTimes(1);
    expect(runDownloadAttemptMock).toHaveBeenCalledTimes(0);
  });

  it('should throw aborted error when retry returns aborted cause', async () => {
    // Given
    createTransientErrorHandlerMock.mockReturnValue(vi.fn());
    retryWithBackoffMock.mockResolvedValue({ error: { cause: 'ABORTED' } });

    // Then
    await expect(
      downloadFile({
        networkApiUrl: 'https://api',
        bucketId: 'bucket-id',
        fileId: 'file-id',
        options: { notifyProgress: vi.fn() },
      }),
    ).rejects.toThrow('Download aborted');
  });

  it('should throw lastError when available', async () => {
    // Given
    const error = new Error('boom');
    createTransientErrorHandlerMock.mockReturnValue(vi.fn());
    retryWithBackoffMock.mockImplementation(async (operation: () => Promise<unknown>) => {
      await operation();
      return { error: { cause: 'UNKNOWN' } };
    });
    runDownloadAttemptMock.mockImplementation(async ({ state }: { state: { lastError?: unknown } }) => {
      state.lastError = error;
      return { error: { cause: 'UNKNOWN' } };
    });

    // Then
    await expect(
      downloadFile({
        networkApiUrl: 'https://api',
        bucketId: 'bucket-id',
        fileId: 'file-id',
        options: { notifyProgress: vi.fn() },
      }),
    ).rejects.toThrow('boom');
  });
});
