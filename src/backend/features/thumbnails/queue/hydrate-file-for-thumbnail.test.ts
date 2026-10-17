import type { File } from '../../../../context/virtual-drive/files/domain/File';
import * as readOrHydrateModule from '../../fuse/on-read/hydrate-file-range';
import * as hydrationStateModule from '../../fuse/on-read/download-cache/hydration-state';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { hydrateFileForThumbnail } from './hydrate-file-for-thumbnail';
import { MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES } from '../thumbnail.constants';

describe('hydrate-file-for-thumbnail', () => {
  const hydrateFileRangeMock = partialSpyOn(readOrHydrateModule, 'hydrateFileRange');
  const getExistingHydrationStateMock = partialSpyOn(hydrationStateModule, 'getExistingHydrationState');
  const isRangeHydratedMock = partialSpyOn(hydrationStateModule, 'isRangeHydrated');

  const file = {
    contentsId: 'content-id',
    nameWithExtension: 'photo.jpg',
    size: 100,
  } as unknown as File;
  const network = {} as Parameters<typeof readOrHydrateModule.hydrateFileRange>[0]['network'];

  beforeEach(() => {
    vi.clearAllMocks();
    getExistingHydrationStateMock.mockReturnValue(undefined);
    isRangeHydratedMock.mockReturnValue(false);
    hydrateFileRangeMock.mockResolvedValue({ data: undefined });
  });

  it('should return immediately if file target range is already hydrated', async () => {
    const state = {} as hydrationStateModule.FileHydrationState;
    getExistingHydrationStateMock.mockReturnValue(state);
    isRangeHydratedMock.mockReturnValue(true);

    const result = await hydrateFileForThumbnail({
      file,
      filePath: '/path/file',
      bucketId: 'bucket',
      mnemonic: 'secret',
      network,
    });

    expect(result.data).toBeUndefined();
    expect(hydrateFileRangeMock).not.toHaveBeenCalled();
    expect(isRangeHydratedMock).toHaveBeenCalledWith(state, { position: 0, length: 100 });
  });

  it('should hydrate file range in blocks', async () => {
    const largeFile = {
      contentsId: 'content-id',
      nameWithExtension: 'large.jpg',
      size: 4 * 1024 * 1024 + 10,
    } as unknown as File;

    const result = await hydrateFileForThumbnail({
      file: largeFile,
      filePath: '/path/large',
      bucketId: 'bucket',
      mnemonic: 'secret',
      network,
    });

    expect(result.data).toBeUndefined();
    expect(hydrateFileRangeMock).toHaveBeenCalledTimes(2);
    expect(hydrateFileRangeMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        range: { position: 0, length: 4 * 1024 * 1024 },
      }),
    );
    expect(hydrateFileRangeMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        range: { position: 4 * 1024 * 1024, length: 10 },
      }),
    );
  });

  it('should limit hydration for large video files to MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES', async () => {
    const hugeVideo = {
      contentsId: 'video-id',
      nameWithExtension: 'huge-video.mp4',
      size: 1024 * 1024 * 1024, // 1 GB
    } as unknown as File;

    const result = await hydrateFileForThumbnail({
      file: hugeVideo,
      filePath: '/path/video',
      bucketId: 'bucket',
      mnemonic: 'secret',
      network,
    });

    expect(result.data).toBeUndefined();
    // 16 MB with 4 MB blocks = exactly 4 blocks
    expect(hydrateFileRangeMock).toHaveBeenCalledTimes(MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES / (4 * 1024 * 1024));
  });

  it('should return error when hydrateFileRange fails', async () => {
    const error = new Error('Network error');
    hydrateFileRangeMock.mockResolvedValue({ error: error as never });

    const result = await hydrateFileForThumbnail({
      file,
      filePath: '/path/file',
      bucketId: 'bucket',
      mnemonic: 'secret',
      network,
    });

    expect(result.error).toBe(error);
  });

  it('should return error when hydration was aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();
    getExistingHydrationStateMock.mockReturnValue({
      abortController,
    } as unknown as hydrationStateModule.FileHydrationState);

    const result = await hydrateFileForThumbnail({
      file,
      filePath: '/path/file',
      bucketId: 'bucket',
      mnemonic: 'secret',
      network,
    });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Thumbnail file hydration was aborted');
  });
});
