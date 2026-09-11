import { warmDownloadLinks } from './warm-download-links';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { testSleep } from '../../../../../tests/vitest/utils.helper';

function buildFile(overrides: Partial<File> = {}): File {
  return {
    contentsId: 'contents-id',
    nameWithExtension: 'photo.png',
    type: 'png',
    ...overrides,
  } as unknown as File;
}

function buildImages(count: number): File[] {
  return Array.from({ length: count }, (_, index) =>
    buildFile({ contentsId: `image-${index}`, nameWithExtension: `image-${index}.png` }),
  );
}

describe('warmDownloadLinks', () => {
  it('resolves download links only for thumbnail-able files', async () => {
    const getDownloadLinksMock = vi.fn().mockResolvedValue(undefined);
    const files = [
      buildFile({ contentsId: 'image-1', type: 'png' }),
      buildFile({ contentsId: 'video-1', type: 'mp4' }),
      buildFile({ contentsId: 'image-2', type: 'jpeg' }),
    ];

    warmDownloadLinks({
      files,
      bucketId: 'bucket-id',
      network: { getDownloadLinks: getDownloadLinksMock } as never,
    });

    await testSleep(10);

    expect(getDownloadLinksMock).toHaveBeenCalledTimes(2);
    expect(getDownloadLinksMock).toHaveBeenCalledWith('bucket-id', 'image-1');
    expect(getDownloadLinksMock).toHaveBeenCalledWith('bucket-id', 'image-2');
  });

  it('does nothing when there are no thumbnail-able files', async () => {
    const getDownloadLinksMock = vi.fn();

    warmDownloadLinks({
      files: [buildFile({ type: 'mp4' })],
      bucketId: 'bucket-id',
      network: { getDownloadLinks: getDownloadLinksMock } as never,
    });

    await testSleep(10);

    expect(getDownloadLinksMock).not.toHaveBeenCalled();
  });

  it('does not throw when a link resolution fails', async () => {
    const getDownloadLinksMock = vi.fn().mockRejectedValue(new Error('network error'));

    expect(() =>
      warmDownloadLinks({
        files: [buildFile()],
        bucketId: 'bucket-id',
        network: { getDownloadLinks: getDownloadLinksMock } as never,
      }),
    ).not.toThrow();

    await testSleep(10);

    expect(getDownloadLinksMock).toHaveBeenCalledOnce();
  });

  it('warms a bounded window instead of the whole folder', async () => {
    const getDownloadLinksMock = vi.fn().mockResolvedValue(undefined);

    warmDownloadLinks({
      files: buildImages(500),
      bucketId: 'bucket-id',
      network: { getDownloadLinks: getDownloadLinksMock } as never,
    });

    await testSleep(20);

    expect(getDownloadLinksMock).toHaveBeenCalledTimes(20);
    expect(getDownloadLinksMock).toHaveBeenCalledWith('bucket-id', 'image-0');
    expect(getDownloadLinksMock).not.toHaveBeenCalledWith('bucket-id', 'image-20');
  });

  it('warms the files that follow the one being read', async () => {
    const getDownloadLinksMock = vi.fn().mockResolvedValue(undefined);

    warmDownloadLinks({
      files: buildImages(500),
      bucketId: 'bucket-id',
      network: { getDownloadLinks: getDownloadLinksMock } as never,
      afterContentsId: 'image-100',
    });

    await testSleep(20);

    expect(getDownloadLinksMock).toHaveBeenCalledTimes(20);
    expect(getDownloadLinksMock).toHaveBeenCalledWith('bucket-id', 'image-101');
    expect(getDownloadLinksMock).toHaveBeenCalledWith('bucket-id', 'image-120');
    expect(getDownloadLinksMock).not.toHaveBeenCalledWith('bucket-id', 'image-100');
  });

  it('does nothing when the folder has no files left after the current one', async () => {
    const getDownloadLinksMock = vi.fn();

    warmDownloadLinks({
      files: buildImages(3),
      bucketId: 'bucket-id',
      network: { getDownloadLinks: getDownloadLinksMock } as never,
      afterContentsId: 'image-2',
    });

    await testSleep(10);

    expect(getDownloadLinksMock).not.toHaveBeenCalled();
  });

  it('should enforce concurrency globally across multiple calls', async () => {
    let active = 0;
    let maximumActive = 0;
    const getDownloadLinksMock = vi.fn().mockImplementation(async () => {
      active++;
      maximumActive = Math.max(maximumActive, active);
      await testSleep(20);
      active--;
    });
    const files = buildImages(40);
    const network = { getDownloadLinks: getDownloadLinksMock } as never;

    warmDownloadLinks({ files, bucketId: 'bucket-id', network });
    warmDownloadLinks({ files, bucketId: 'bucket-id', network, afterContentsId: 'image-1' });

    await testSleep(140);

    expect(maximumActive).toBe(5);
  });

  it('should deduplicate contents ids across overlapping calls', async () => {
    const getDownloadLinksMock = vi.fn().mockImplementation(async () => {
      await testSleep(20);
    });
    const files = buildImages(40);
    const network = { getDownloadLinks: getDownloadLinksMock } as never;

    warmDownloadLinks({ files, bucketId: 'bucket-id', network });
    warmDownloadLinks({ files, bucketId: 'bucket-id', network });

    await testSleep(120);

    expect(getDownloadLinksMock).toHaveBeenCalledTimes(20);
  });
});
