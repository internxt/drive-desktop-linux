import * as transientErrorHandlerModule from '../../common/rate-limit/transient-error-handler';
import * as retryWithBackoffModule from '../../../shared/retry-with-backoff';
import * as runDownloadAttemptModule from './run-download-attempt';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
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
    expect(result).toStrictEqual({ data: stream });
    expect(retryWithBackoffMock).toHaveBeenCalledTimes(1);
    expect(runDownloadAttemptMock).toHaveBeenCalledTimes(0);
  });

  it('should return aborted error when retry returns aborted cause', async () => {
    // Given
    createTransientErrorHandlerMock.mockReturnValue(vi.fn());
    retryWithBackoffMock.mockResolvedValue({ error: { cause: 'ABORTED' } });

    // When
    const result = await downloadFile({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      options: { notifyProgress: vi.fn() },
    });

    // Then
    expect(result).toStrictEqual({ error: { cause: 'ABORTED' } });
  });

  it('should return retry error when download fails', async () => {
    // Given
    const error = new DriveDesktopError('UNKNOWN', 'boom');
    createTransientErrorHandlerMock.mockReturnValue(vi.fn());
    retryWithBackoffMock.mockResolvedValue({ error });

    // When
    const result = await downloadFile({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      options: { notifyProgress: vi.fn() },
    });

    // Then
    expect(result).toStrictEqual({ error });
  });
});
