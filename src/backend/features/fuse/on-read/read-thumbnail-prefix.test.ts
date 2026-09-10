import { readThumbnailPrefix } from './read-thumbnail-prefix';
import * as downloadFileModule from '../../../../infra/environment/download-file/download-file';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { FuseIOError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { partialSpyOn, call } from '../../../../../tests/vitest/utils.helper';
import * as fileExistsModule from './download-cache/file-exists-on-disk';
import * as hydrationStateModule from './download-cache/hydration-state';
import * as readChunkModule from './read-chunk-from-disk';

const downloadFileRangeMock = partialSpyOn(downloadFileModule, 'downloadFileRange');
const fileExistsOnDiskMock = partialSpyOn(fileExistsModule, 'fileExistsOnDisk');
const getExistingHydrationStateMock = partialSpyOn(hydrationStateModule, 'getExistingHydrationState');
const isRangeHydratedMock = partialSpyOn(hydrationStateModule, 'isRangeHydrated');
const readChunkFromDiskMock = partialSpyOn(readChunkModule, 'readChunkFromDisk');

const virtualFile = {
  contentsId: 'contents-id',
  nameWithExtension: 'big.json',
  size: 4_000_000,
} as unknown as File;

function deps() {
  return { bucketId: 'bucket-id', mnemonic: 'mnemonic', network: {} as never };
}

describe('read-thumbnail-prefix', () => {
  beforeEach(() => {
    downloadFileRangeMock.mockResolvedValue({ data: Buffer.from('prefix') });
    fileExistsOnDiskMock.mockResolvedValue(false);
    getExistingHydrationStateMock.mockReturnValue(undefined);
    isRangeHydratedMock.mockReturnValue(false);
    readChunkFromDiskMock.mockResolvedValue(Buffer.from('cached-prefix'));
  });

  it('should download only the requested range', async () => {
    const result = await readThumbnailPrefix({
      virtualFile,
      filePath: '/cache/contents-id',
      range: { position: 0, length: 32768 },
      ...deps(),
    });

    expect(result.data).toStrictEqual(Buffer.from('prefix'));
    call(downloadFileRangeMock).toMatchObject({
      fileId: 'contents-id',
      range: { position: 0, length: 32768 },
    });
  });

  it('should clamp the range to the end of the file', async () => {
    const smallFile = { ...virtualFile, size: 100 } as unknown as File;

    await readThumbnailPrefix({
      virtualFile: smallFile,
      filePath: '/cache/contents-id',
      range: { position: 80, length: 32768 },
      ...deps(),
    });

    call(downloadFileRangeMock).toMatchObject({ range: { position: 80, length: 20 } });
  });

  it('should return empty data when the range starts past the end of the file', async () => {
    const result = await readThumbnailPrefix({
      virtualFile,
      filePath: '/cache/contents-id',
      range: { position: 4_000_000, length: 32768 },
      ...deps(),
    });

    expect(result.data).toStrictEqual(Buffer.alloc(0));
    expect(downloadFileRangeMock).not.toHaveBeenCalled();
  });

  it('should return an IO error when the download fails', async () => {
    downloadFileRangeMock.mockResolvedValue({ error: new Error('network error') });

    const result = await readThumbnailPrefix({
      virtualFile,
      filePath: '/cache/contents-id',
      range: { position: 0, length: 32768 },
      ...deps(),
    });

    expect(result.error).toBeInstanceOf(FuseIOError);
  });

  it('should serve a fully hydrated large file from disk while offline', async () => {
    const state = {} as Parameters<typeof isRangeHydrated>[0];
    getExistingHydrationStateMock.mockReturnValue(state);
    isRangeHydratedMock.mockReturnValue(true);
    fileExistsOnDiskMock.mockResolvedValue(true);

    const result = await readThumbnailPrefix({
      virtualFile,
      filePath: '/cache/contents-id',
      range: { position: 0, length: 32768 },
      ...deps(),
    });

    expect(result.data).toStrictEqual(Buffer.from('cached-prefix'));
    expect(downloadFileRangeMock).not.toHaveBeenCalled();
    expect(readChunkFromDiskMock).toHaveBeenCalledWith('/cache/contents-id', 32768, 0);
  });
});
