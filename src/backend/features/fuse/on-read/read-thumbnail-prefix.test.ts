import { readThumbnailPrefix } from './read-thumbnail-prefix';
import * as downloadFileModule from '../../../../infra/environment/download-file/download-file';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { FuseIOError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { partialSpyOn, call } from '../../../../../tests/vitest/utils.helper';

const downloadFileRangeMock = partialSpyOn(downloadFileModule, 'downloadFileRange');

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
  });

  it('should download only the requested range', async () => {
    const result = await readThumbnailPrefix({
      virtualFile,
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

    await readThumbnailPrefix({ virtualFile: smallFile, range: { position: 80, length: 32768 }, ...deps() });

    call(downloadFileRangeMock).toMatchObject({ range: { position: 80, length: 20 } });
  });

  it('should return empty data when the range starts past the end of the file', async () => {
    const result = await readThumbnailPrefix({
      virtualFile,
      range: { position: 4_000_000, length: 32768 },
      ...deps(),
    });

    expect(result.data).toStrictEqual(Buffer.alloc(0));
    expect(downloadFileRangeMock).not.toHaveBeenCalled();
  });

  it('should return an IO error when the download fails', async () => {
    downloadFileRangeMock.mockResolvedValue({ error: new Error('network error') });

    const result = await readThumbnailPrefix({ virtualFile, range: { position: 0, length: 32768 }, ...deps() });

    expect(result.error).toBeInstanceOf(FuseIOError);
  });
});
