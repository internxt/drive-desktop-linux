import { mockDeep } from 'vitest-mock-extended';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Container } from 'diod';
import { File } from '../../../../context/virtual-drive/files/domain/File';
import { FirstsFileSearcher } from '../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import * as credentialsModule from '../../../../apps/main/auth/get-credentials';
import * as getUserModule from '../../auth/get-user';
import * as networkClientModule from '../../../../infra/environment/download-file/build-network-client';
import * as hydrateFileForThumbnailModule from './hydrate-file-for-thumbnail';
import * as createSystemThumbnailModule from './create-system-thumbnail';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { syncThumbnailFolder } from './sync-thumbnail-folder';
import type { ThumbnailFolderTask } from './types';

const getCredentialsMock = partialSpyOn(credentialsModule, 'getCredentials');
const getUserMock = partialSpyOn(getUserModule, 'getUser');
const buildNetworkClientMock = partialSpyOn(networkClientModule, 'buildNetworkClient');
const hydrateFileForThumbnailMock = partialSpyOn(hydrateFileForThumbnailModule, 'hydrateFileForThumbnail');
const createSystemThumbnailMock = partialSpyOn(createSystemThumbnailModule, 'createSystemThumbnail');

describe('sync-thumbnail-folder', () => {
  const debugMock = partialSpyOn(logger, 'debug');
  const container = mockDeep<Container>();
  const fileSearcher = mockDeep<FirstsFileSearcher>();
  const user = {
    bucket: 'bucket-id',
    bridgeUser: 'bridge-user',
    userId: 'user-id',
  };
  const network = {};
  let task: ThumbnailFolderTask;

  beforeEach(() => {
    vi.clearAllMocks();
    container.get.calledWith(FirstsFileSearcher).mockReturnValue(fileSearcher);
    getCredentialsMock.mockReturnValue({ mnemonic: 'mnemonic' } as never);
    getUserMock.mockReturnValue({ data: user } as never);
    buildNetworkClientMock.mockReturnValue(network as never);
    hydrateFileForThumbnailMock.mockResolvedValue({ data: undefined });
    createSystemThumbnailMock.mockResolvedValue(true);
    task = {
      folderPath: '/photos',
      fileNames: ['photo.jpg', 'clip.mp4', 'installer.exe', 'document.pdf'],
      container,
      enqueuedAt: 1,
    };
  });

  it('should hydrate only supported media files in background and create system thumbnails', async () => {
    const photo = {
      contentsId: 'photo-content-id',
      name: 'photo.jpg',
      nameWithExtension: 'photo.jpg',
      path: '/photos/photo.jpg',
      size: 10,
      type: 'jpg',
      modificationTime: new Date('2025-01-01T00:00:00.000Z'),
    } as unknown as File;
    const video = {
      contentsId: 'video-content-id',
      name: 'clip.mp4',
      nameWithExtension: 'clip.mp4',
      path: '/photos/clip.mp4',
      size: 20,
      type: 'mp4',
    } as unknown as File;
    fileSearcher.run.mockResolvedValueOnce(photo).mockResolvedValueOnce(video);

    const completed = await syncThumbnailFolder(task);

    expect(completed).toBe(true);
    expect(fileSearcher.run).toHaveBeenCalledTimes(2);
    expect(hydrateFileForThumbnailMock).toHaveBeenCalledTimes(2);
    expect(hydrateFileForThumbnailMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ file: photo }));
    expect(hydrateFileForThumbnailMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ file: video }));
    expect(createSystemThumbnailMock).toHaveBeenCalledTimes(2);
    expect(createSystemThumbnailMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ file: photo, sourceFilePath: expect.stringContaining('photo-content-id') }),
    );
    expect(createSystemThumbnailMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ file: video, sourceFilePath: expect.stringContaining('video-content-id') }),
    );
    expect(debugMock).toHaveBeenCalledTimes(2);
  });

  it('should stop syncing a folder if authentication is unavailable', async () => {
    getUserMock.mockReturnValue({ error: new Error('not signed in') } as never);

    const completed = await syncThumbnailFolder(task);

    expect(completed).toBe(false);
    expect(fileSearcher.run).not.toHaveBeenCalled();
    expect(hydrateFileForThumbnailMock).not.toHaveBeenCalled();
  });

  it('should not mark folder completed if hydration fails', async () => {
    const photo = {
      contentsId: 'photo-content-id',
      nameWithExtension: 'photo.jpg',
      path: '/photos/photo.jpg',
      size: 10,
      type: 'jpg',
    } as unknown as File;
    fileSearcher.run.mockResolvedValueOnce(photo);
    hydrateFileForThumbnailMock.mockResolvedValueOnce({ error: new Error('Network error') });

    task = { ...task, fileNames: ['photo.jpg'] };
    const completed = await syncThumbnailFolder(task);

    expect(completed).toBe(false);
    expect(createSystemThumbnailMock).not.toHaveBeenCalled();
  });

  it('should not mark folder completed if thumbnail creation fails', async () => {
    task = { ...task, fileNames: ['img_786.jpg'] };
    fileSearcher.run.mockResolvedValueOnce({
      contentsId: 'invalid-image',
      nameWithExtension: 'img_786.jpg',
      path: '/photos/img_786.jpg',
      size: 452,
      type: 'jpg',
    } as unknown as File);
    createSystemThumbnailMock.mockResolvedValueOnce(false);

    const completed = await syncThumbnailFolder(task);

    expect(completed).toBe(false);
    expect(debugMock).not.toHaveBeenCalled();
  });
});
