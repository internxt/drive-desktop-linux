import { prefetchThumbnailContent } from './prefetch-thumbnail-content';
import * as readOrHydrateModule from './read-or-hydrate';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { partialSpyOn, testSleep } from '../../../../../tests/vitest/utils.helper';

const readOrHydrateMock = partialSpyOn(readOrHydrateModule, 'readOrHydrate');

function buildFile(overrides: Partial<File> = {}) {
  return {
    contentsId: 'contents-id',
    nameWithExtension: 'photo.png',
    type: 'png',
    size: 200_000,
    ...overrides,
  } as unknown as File;
}

function buildImages(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildFile({ contentsId: `image-${index}`, nameWithExtension: `image-${index}.png` }),
  );
}

function deps() {
  return {
    bucketId: 'bucket-id',
    mnemonic: 'mnemonic',
    network: {} as never,
  };
}

describe('prefetch-thumbnail-content', () => {
  beforeEach(() => {
    readOrHydrateMock.mockResolvedValue({ data: Buffer.alloc(0) });
  });

  it('should prefetch a bounded window of the files that follow the current one', async () => {
    prefetchThumbnailContent({ files: buildImages(50), afterContentsId: 'image-10', ...deps() });

    await testSleep(20);

    expect(readOrHydrateMock).toHaveBeenCalledTimes(4);
    const prefetched = readOrHydrateMock.mock.calls.map(([props]) => props.virtualFile.contentsId);
    expect(prefetched).toStrictEqual(['image-11', 'image-12', 'image-13', 'image-14']);
  });

  it('should skip files that cannot generate a thumbnail', async () => {
    const files = [
      buildFile({ contentsId: 'image-0', type: 'png' }),
      buildFile({ contentsId: 'video-0', type: 'mp4' }),
      buildFile({ contentsId: 'image-1', type: 'jpeg' }),
    ];

    prefetchThumbnailContent({ files, afterContentsId: 'image-0', ...deps() });

    await testSleep(20);

    expect(readOrHydrateMock).toHaveBeenCalledOnce();
    expect(readOrHydrateMock.mock.calls[0][0].virtualFile.contentsId).toBe('image-1');
  });

  it('should do nothing when the current file is the last one', async () => {
    prefetchThumbnailContent({ files: buildImages(3), afterContentsId: 'image-2', ...deps() });

    await testSleep(20);

    expect(readOrHydrateMock).not.toHaveBeenCalled();
  });

  it('should skip files too large to be worth caching a whole block for', async () => {
    const files = [
      buildFile({ contentsId: 'image-0' }),
      buildFile({ contentsId: 'huge', size: 4_000_000 }),
      buildFile({ contentsId: 'image-1' }),
    ];

    prefetchThumbnailContent({ files, afterContentsId: 'image-0', ...deps() });

    await testSleep(20);

    expect(readOrHydrateMock).toHaveBeenCalledOnce();
    expect(readOrHydrateMock.mock.calls[0][0].virtualFile.contentsId).toBe('image-1');
  });

  it('should not throw when a prefetch fails', async () => {
    readOrHydrateMock.mockRejectedValue(new Error('network error'));

    expect(() =>
      prefetchThumbnailContent({ files: buildImages(3), afterContentsId: 'image-0', ...deps() }),
    ).not.toThrow();

    await testSleep(20);

    expect(readOrHydrateMock).toHaveBeenCalledTimes(2);
  });
});
