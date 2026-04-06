vi.mock('@internxt/drive-desktop-core/build/backend', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { logger } from '@internxt/drive-desktop-core/build/backend';
import * as virtualDriveIssuesModule from '../issues/virtual-drive';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { createRemoteSyncErrorHandler } from './create-remote-sync-error-handler';
import {
  RemoteSyncError,
  RemoteSyncInvalidResponseError,
  RemoteSyncNetworkError,
  RemoteSyncServerError,
} from './errors';

describe('create-remote-sync-error-handler.test', () => {
  const addVirtualDriveIssueMock = partialSpyOn(virtualDriveIssuesModule, 'addVirtualDriveIssue');

  beforeEach(() => {
    addVirtualDriveIssueMock.mockReset();
    vi.mocked(logger.error).mockReset();
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
    expect(logger.error).toHaveBeenCalledTimes(1);
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
    expect(logger.error).toHaveBeenCalledTimes(1);
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
    expect(addVirtualDriveIssueMock).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
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
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});