import { call } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';

import { RemoteSyncNetworkError } from '../../../apps/main/remote-sync/errors';
import type { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { handleSyncFileFailure } from './handle-sync-file-failure';

describe('handle-sync-file-failure', () => {
  const errorHandler = {
    handleSyncError: vi.fn(),
  } as unknown as RemoteSyncErrorHandler;

  const checkpoint = new Date('2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delegate to errorHandler when error is a RemoteSyncError', () => {
    // Given
    const error = new RemoteSyncNetworkError('Network timeout');

    // When
    handleSyncFileFailure({
      error,
      errorHandler,
      fileCheckPoint: checkpoint,
    });

    // Then
    call(vi.mocked(errorHandler.handleSyncError)).toMatchObject([error, 'files', 'unknown', checkpoint]);
  });

  it('should convert DriveServerError to RemoteSyncNetworkError and delegate to errorHandler', () => {
    // Given
    const driveError = new DriveServerError('NETWORK_ERROR', 503, 'Service unavailable');

    // When
    handleSyncFileFailure({
      error: driveError,
      errorHandler,
      fileCheckPoint: checkpoint,
    });

    // Then
    expect(errorHandler.handleSyncError).toHaveBeenCalledTimes(1);
    const [passedError, type, name, date] = vi.mocked(errorHandler.handleSyncError).mock.calls[0];
    expect(passedError).toBeInstanceOf(RemoteSyncNetworkError);
    expect(passedError.message).toContain('Service unavailable');
    expect(type).toBe('files');
    expect(name).toBe('unknown');
    expect(date).toBe(checkpoint);
  });

  it('should log error when error is uncontrolled and not call errorHandler', () => {
    // Given
    const genericError = new Error('Unexpected crash');

    // When
    handleSyncFileFailure({
      error: genericError,
      errorHandler,
      fileCheckPoint: checkpoint,
    });

    // Then
    expect(errorHandler.handleSyncError).not.toHaveBeenCalled();
    call(loggerMock.error).toMatchObject({
      tag: 'SYNC-ENGINE',
      msg: 'Remote files sync failed with uncontrolled error',
      error: genericError,
    });
  });
});
