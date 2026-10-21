import { logger } from '@internxt/drive-desktop-core/build/backend';
import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import type { File } from '../../../../context/virtual-drive/files/domain/File';
import { FirstsFileSearcher } from '../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { FileStatuses } from '../../../../context/virtual-drive/files/domain/FileStatus';
import * as ensureThumbnailSourceModule from './ensure-thumbnail-source';
import * as createSystemThumbnailModule from './create-system-thumbnail';
import { call, calls, partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { syncThumbnailFile } from './sync-thumbnail-file';

describe('sync-thumbnail-file', () => {
  const ensureThumbnailSourceMock = partialSpyOn(ensureThumbnailSourceModule, 'ensureThumbnailSource');
  const createSystemThumbnailMock = partialSpyOn(createSystemThumbnailModule, 'createSystemThumbnail');
  const debugMock = partialSpyOn(logger, 'debug');
  const warnMock = partialSpyOn(logger, 'warn');

  const container = mockDeep<Container>();
  const fileSearcher = mockDeep<FirstsFileSearcher>();
  const network = {} as Parameters<typeof syncThumbnailFile>[0]['network'];
  const photo = {
    contentsId: 'photo-content-id',
    nameWithExtension: 'photo.jpg',
    size: 10,
    type: 'jpg',
  } as unknown as File;

  let props: Parameters<typeof syncThumbnailFile>[0];

  beforeEach(() => {
    container.get.calledWith(FirstsFileSearcher).mockReturnValue(fileSearcher);
    fileSearcher.run.mockResolvedValue(photo);
    ensureThumbnailSourceMock.mockResolvedValue({ data: '/cache/photo-content-id' });
    createSystemThumbnailMock.mockResolvedValue(true);

    props = {
      fileName: 'photo.jpg',
      folderPath: '/photos',
      container,
      bucketId: 'bucket-id',
      mnemonic: 'mnemonic',
      network,
    };
  });

  it('should create a system thumbnail when the source is ready', async () => {
    // When
    const synced = await syncThumbnailFile(props);

    // Then
    expect(synced).toBe(true);
    call(fileSearcher.run).toStrictEqual({
      path: '/photos/photo.jpg',
      status: FileStatuses.EXISTS,
    });
    call(ensureThumbnailSourceMock).toMatchObject({
      file: photo,
      bucketId: 'bucket-id',
      mnemonic: 'mnemonic',
      network,
    });
    call(createSystemThumbnailMock).toStrictEqual({
      file: photo,
      sourceFilePath: '/cache/photo-content-id',
    });
    calls(debugMock).toHaveLength(1);
  });

  it('should skip a missing file', async () => {
    // Given
    fileSearcher.run.mockResolvedValue(undefined);

    // When
    const synced = await syncThumbnailFile(props);

    // Then
    expect(synced).toBe(true);
    calls(ensureThumbnailSourceMock).toHaveLength(0);
    calls(createSystemThumbnailMock).toHaveLength(0);
  });

  it('should skip an empty file', async () => {
    // Given
    fileSearcher.run.mockResolvedValue({ ...photo, size: 0 } as unknown as File);

    // When
    const synced = await syncThumbnailFile(props);

    // Then
    expect(synced).toBe(true);
    calls(ensureThumbnailSourceMock).toHaveLength(0);
    calls(createSystemThumbnailMock).toHaveLength(0);
  });

  it('should return false when the source cannot be prepared', async () => {
    // Given
    ensureThumbnailSourceMock.mockResolvedValue({ error: new Error('Network error') });

    // When
    const synced = await syncThumbnailFile(props);

    // Then
    expect(synced).toBe(false);
    calls(createSystemThumbnailMock).toHaveLength(0);
    calls(debugMock).toHaveLength(0);
    calls(warnMock).toHaveLength(1);
  });

  it('should return false when thumbnail creation fails', async () => {
    // Given
    createSystemThumbnailMock.mockResolvedValue(false);

    // When
    const synced = await syncThumbnailFile(props);

    // Then
    expect(synced).toBe(false);
    calls(debugMock).toHaveLength(0);
  });

  it('should return false when syncing the file throws', async () => {
    // Given
    fileSearcher.run.mockRejectedValue(new Error('search failed'));

    // When
    const synced = await syncThumbnailFile(props);

    // Then
    expect(synced).toBe(false);
    calls(warnMock).toHaveLength(1);
    calls(createSystemThumbnailMock).toHaveLength(0);
  });
});
