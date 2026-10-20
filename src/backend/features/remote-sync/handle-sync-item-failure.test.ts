import { call } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';

import { RemoteSyncNetworkError } from '../../../apps/main/remote-sync/errors';
import type { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { handleSyncItemFailure } from './handle-sync-item-failure';

describe('handle-sync-item-failure', () => {
  const errorHandler = {
    handleSyncError: vi.fn(),
  } as unknown as RemoteSyncErrorHandler;

  const checkpoint = new Date('2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['files', 'folders'] as const)('should delegate %s RemoteSyncError to errorHandler', (syncItemType) => {
    // Given
    const error = new RemoteSyncNetworkError('Network timeout');

    // When
    handleSyncItemFailure({
      error,
      errorHandler,
      syncItemType,
      itemCheckpoint: checkpoint,
    });

    // Then
    call(vi.mocked(errorHandler.handleSyncError)).toMatchObject([error, syncItemType, 'unknown', checkpoint]);
  });

  it.each(['files', 'folders'] as const)(
    'should convert %s DriveServerError and delegate to errorHandler',
    (syncItemType) => {
      // Given
      const driveError = new DriveServerError('NETWORK_ERROR', 503, 'Service unavailable');

      // When
      handleSyncItemFailure({
        error: driveError,
        errorHandler,
        syncItemType,
        itemCheckpoint: checkpoint,
      });

      // Then
      expect(errorHandler.handleSyncError).toHaveBeenCalledTimes(1);
      const [passedError, type, name, date] = vi.mocked(errorHandler.handleSyncError).mock.calls[0];
      expect(passedError).toBeInstanceOf(RemoteSyncNetworkError);
      expect(passedError.message).toContain('Service unavailable');
      expect(type).toBe(syncItemType);
      expect(name).toBe('unknown');
      expect(date).toBe(checkpoint);
    },
  );

  it.each(['files', 'folders'] as const)(
    'should log uncontrolled %s errors without calling errorHandler',
    (syncItemType) => {
      // Given
      const genericError = new Error('Unexpected crash');

      // When
      handleSyncItemFailure({
        error: genericError,
        errorHandler,
        syncItemType,
        itemCheckpoint: checkpoint,
      });

      // Then
      expect(errorHandler.handleSyncError).not.toHaveBeenCalled();
      call(loggerMock.error).toMatchObject({
        tag: 'SYNC-ENGINE',
        msg: `Remote ${syncItemType} sync failed with uncontrolled error`,
        error: genericError,
      });
    },
  );
});
