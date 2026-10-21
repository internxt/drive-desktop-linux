import { join } from 'node:path';
import { PATHS } from '../../../../core/electron/paths';
import type { File } from '../../../../context/virtual-drive/files/domain/File';
import * as hydrationStateModule from '../../fuse/on-read/download-cache/hydration-state';
import * as fileExistsOnDiskModule from '../../fuse/on-read/download-cache/file-exists-on-disk';
import * as hydrateFileForThumbnailModule from './hydrate-file-for-thumbnail';
import { call, calls, partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { ensureThumbnailSource } from './ensure-thumbnail-source';

describe('ensure-thumbnail-source', () => {
  const getExistingHydrationStateMock = partialSpyOn(hydrationStateModule, 'getExistingHydrationState');
  const isRangeHydratedMock = partialSpyOn(hydrationStateModule, 'isRangeHydrated');
  const clearHydrationStateForFileMock = partialSpyOn(hydrationStateModule, 'clearHydrationStateForFile');
  const fileExistsOnDiskMock = partialSpyOn(fileExistsOnDiskModule, 'fileExistsOnDisk');
  const hydrateFileForThumbnailMock = partialSpyOn(hydrateFileForThumbnailModule, 'hydrateFileForThumbnail');

  const file = {
    contentsId: 'photo-content-id',
    nameWithExtension: 'photo.jpg',
    size: 100,
  } as unknown as File;
  const network = {} as Parameters<typeof hydrateFileForThumbnailModule.hydrateFileForThumbnail>[0]['network'];
  const cachePath = join(PATHS.DOWNLOADED, file.contentsId);
  const hydratedState = { abortController: new AbortController() } as hydrationStateModule.FileHydrationState;

  let props: Parameters<typeof ensureThumbnailSource>[0];

  beforeEach(() => {
    getExistingHydrationStateMock.mockReturnValue(undefined);
    isRangeHydratedMock.mockReturnValue(false);
    fileExistsOnDiskMock.mockResolvedValue(false);
    hydrateFileForThumbnailMock.mockResolvedValue({ data: undefined });

    props = {
      file,
      bucketId: 'bucket-id',
      mnemonic: 'mnemonic',
      network,
    };
  });

  it('should reuse the cached file when the thumbnail range is already hydrated', async () => {
    // Given
    getExistingHydrationStateMock.mockReturnValue(hydratedState);
    isRangeHydratedMock.mockReturnValue(true);
    fileExistsOnDiskMock.mockResolvedValue(true);

    // When
    const result = await ensureThumbnailSource(props);

    // Then
    expect(result).toStrictEqual({ data: cachePath });
    call(isRangeHydratedMock).toStrictEqual([hydratedState, { position: 0, length: file.size }]);
    call(fileExistsOnDiskMock).toBe(cachePath);
    calls(clearHydrationStateForFileMock).toHaveLength(0);
    calls(hydrateFileForThumbnailMock).toHaveLength(0);
  });

  it('should clear stale hydration state and download when the cached file is missing', async () => {
    // Given
    getExistingHydrationStateMock.mockReturnValue(hydratedState);
    isRangeHydratedMock.mockReturnValue(true);
    fileExistsOnDiskMock.mockResolvedValue(false);

    // When
    const result = await ensureThumbnailSource(props);

    // Then
    expect(result).toStrictEqual({ data: cachePath });
    call(clearHydrationStateForFileMock).toStrictEqual({ contentsId: file.contentsId });
    call(hydrateFileForThumbnailMock).toMatchObject({
      file,
      filePath: cachePath,
      bucketId: 'bucket-id',
      mnemonic: 'mnemonic',
      network,
    });
  });

  it('should download when the thumbnail range is not hydrated', async () => {
    // Given
    getExistingHydrationStateMock.mockReturnValue(hydratedState);
    isRangeHydratedMock.mockReturnValue(false);

    // When
    const result = await ensureThumbnailSource(props);

    // Then
    expect(result).toStrictEqual({ data: cachePath });
    calls(clearHydrationStateForFileMock).toHaveLength(0);
    calls(hydrateFileForThumbnailMock).toHaveLength(1);
  });

  it('should return the hydration error', async () => {
    // Given
    const error = new Error('Network error');
    hydrateFileForThumbnailMock.mockResolvedValue({ error });

    // When
    const result = await ensureThumbnailSource(props);

    // Then
    expect(result).toStrictEqual({ error });
    calls(clearHydrationStateForFileMock).toHaveLength(0);
  });
});
