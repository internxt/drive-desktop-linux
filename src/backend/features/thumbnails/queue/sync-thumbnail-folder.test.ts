import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import * as credentialsModule from '../../../../apps/main/auth/get-credentials';
import * as getUserModule from '../../auth/get-user';
import * as networkClientModule from '../../../../infra/environment/download-file/build-network-client';
import * as syncThumbnailFileModule from './sync-thumbnail-file';
import { call, calls, partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { syncThumbnailFolder } from './sync-thumbnail-folder';
import type { ThumbnailFolderTask } from './types';

describe('sync-thumbnail-folder', () => {
  const getCredentialsMock = partialSpyOn(credentialsModule, 'getCredentials');
  const getUserMock = partialSpyOn(getUserModule, 'getUser');
  const buildNetworkClientMock = partialSpyOn(networkClientModule, 'buildNetworkClient');
  const syncThumbnailFileMock = partialSpyOn(syncThumbnailFileModule, 'syncThumbnailFile');

  const container = mockDeep<Container>();
  const user = {
    bucket: 'bucket-id',
    bridgeUser: 'bridge-user',
    userId: 'user-id',
  };
  const network = {};
  let task: ThumbnailFolderTask;

  beforeEach(() => {
    getCredentialsMock.mockReturnValue({ mnemonic: 'mnemonic' });
    getUserMock.mockReturnValue({ data: user });
    buildNetworkClientMock.mockReturnValue(network);
    syncThumbnailFileMock.mockResolvedValue(true);
    task = {
      folderPath: '/photos',
      fileNames: ['photo.jpg', 'clip.mp4', 'installer.exe', 'document.pdf'],
      container,
      enqueuedAt: 1,
    };
  });

  it('should sync only supported media files', async () => {
    // When
    const completed = await syncThumbnailFolder(task);

    // Then
    expect(completed).toBe(true);
    calls(syncThumbnailFileMock).toMatchObject([
      {
        fileName: 'photo.jpg',
        folderPath: '/photos',
        container,
        bucketId: 'bucket-id',
        mnemonic: 'mnemonic',
        network,
      },
      {
        fileName: 'clip.mp4',
        folderPath: '/photos',
        container,
        bucketId: 'bucket-id',
        mnemonic: 'mnemonic',
        network,
      },
    ]);
    call(buildNetworkClientMock).toStrictEqual({ bridgeUser: 'bridge-user', userId: 'user-id' });
  });

  it('should return true without syncing when the folder has no media files', async () => {
    // Given
    task = { ...task, fileNames: ['installer.exe', 'document.pdf'] };

    // When
    const completed = await syncThumbnailFolder(task);

    // Then
    expect(completed).toBe(true);
    calls(syncThumbnailFileMock).toHaveLength(0);
    calls(getUserMock).toHaveLength(0);
  });

  it('should stop syncing a folder if authentication is unavailable', async () => {
    // Given
    getUserMock.mockReturnValue({ error: new Error('not signed in') });

    // When
    const completed = await syncThumbnailFolder(task);

    // Then
    expect(completed).toBe(false);
    calls(syncThumbnailFileMock).toHaveLength(0);
    calls(buildNetworkClientMock).toHaveLength(0);
  });

  it('should keep syncing the folder when one file fails', async () => {
    // Given
    syncThumbnailFileMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    // When
    const completed = await syncThumbnailFolder(task);

    // Then
    expect(completed).toBe(false);
    calls(syncThumbnailFileMock).toHaveLength(2);
  });
});
