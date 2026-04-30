import * as virtualDriveIssuesModule from '../../../apps/main/issues/virtual-drive';
import { call, calls, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { createRemoteSyncErrorHandler } from './remote-sync-error-handler';
import {
  RemoteSyncError,
  RemoteSyncInvalidResponseError,
  RemoteSyncNetworkError,
  RemoteSyncServerError,
} from './errors';
import { loggerMock } from 'tests/vitest/mocks.helper';

describe('remote-sync-error-handler.test', () => {
  const addVirtualDriveIssueMock = partialSpyOn(virtualDriveIssuesModule, 'addVirtualDriveIssue');

  beforeEach(() => {
    addVirtualDriveIssueMock.mockReset();
  });

  it('should add a no-internet issue for file network errors', () => {
    // Given
    const sut = createRemoteSyncErrorHandler();

    // When
    sut.handleSyncError({
      error: new RemoteSyncNetworkError('connection lost'),
      syncItemType: 'files',
      itemName: 'Test File',
    });

    // Then
    call(addVirtualDriveIssueMock).toStrictEqual({
      error: 'DOWNLOAD_ERROR',
      cause: 'NO_INTERNET',
      name: 'Test File',
    });
    calls(loggerMock.error).toHaveLength(1);
  });

  it('should add a remote-connection issue for folder server errors', () => {
    // Given
    const sut = createRemoteSyncErrorHandler();

    // When
    sut.handleSyncError({
      error: new RemoteSyncServerError(500, { message: 'Server error occurred' }),
      syncItemType: 'folders',
      itemName: 'Test Folder',
      itemCheckpoint: new Date('2025-02-24T00:00:00.000Z'),
    });

    // Then
    call(addVirtualDriveIssueMock).toStrictEqual({
      error: 'FOLDER_CREATE_ERROR',
      cause: 'NO_REMOTE_CONNECTION',
      name: 'Test Folder',
    });
    calls(loggerMock.error).toHaveLength(1);
  });

  it('should ignore invalid response errors', () => {
    // Given
    const sut = createRemoteSyncErrorHandler();

    // When
    sut.handleSyncError({
      error: new RemoteSyncInvalidResponseError({ invalid: true }),
      syncItemType: 'files',
      itemName: 'Test File',
    });

    // Then
    calls(addVirtualDriveIssueMock).toHaveLength(0);
    calls(loggerMock.error).toHaveLength(0);
  });

  it('should treat generic remote sync errors as remote connection issues', () => {
    // Given
    const sut = createRemoteSyncErrorHandler();

    // When
    sut.handleSyncError({
      error: new RemoteSyncError('generic failure'),
      syncItemType: 'files',
      itemName: 'Another File',
    });

    // Then
    call(addVirtualDriveIssueMock).toStrictEqual({
      error: 'DOWNLOAD_ERROR',
      cause: 'NO_REMOTE_CONNECTION',
      name: 'Another File',
    });
    calls(loggerMock.error).toHaveLength(1);
  });
});
