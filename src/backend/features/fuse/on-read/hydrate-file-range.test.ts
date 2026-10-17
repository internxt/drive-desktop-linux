import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import * as readChunkModule from './read-chunk-from-disk';
import * as fileExistsModule from './download-cache/file-exists-on-disk';
import * as allocateFileModule from './download-cache/allocate-file';
import * as downloadAndSaveBlockModule from './download-cache/download-and-save-block';
import { clearHydrationState, getExistingHydrationState } from './download-cache/hydration-state';
import { hydrateFileRange, type HydrateFileRangeProps } from './hydrate-file-range';

const readChunkFromDiskMock = partialSpyOn(readChunkModule, 'readChunkFromDisk');
const fileExistsOnDiskMock = partialSpyOn(fileExistsModule, 'fileExistsOnDisk');
const allocateFileMock = partialSpyOn(allocateFileModule, 'allocateFile');
const downloadAndCacheBlockMock = partialSpyOn(downloadAndSaveBlockModule, 'downloadAndCacheBlock');

const virtualFile = {
  contentsId: 'contents-123',
  name: 'video',
  nameWithExtension: 'video.mp4',
  type: 'mp4',
  uuid: 'uuid-123',
  size: 1000,
} as unknown as File;

function createDeps(overrides: Partial<HydrateFileRangeProps> = {}): HydrateFileRangeProps {
  return {
    onDownloadProgress: vi.fn(),
    bucketId: 'bucket-id',
    mnemonic: 'mnemonic',
    network: {} as HydrateFileRangeProps['network'],
    virtualFile,
    filePath: '/tmp/cache-file',
    range: { position: 0, length: 10 },
    ...overrides,
  };
}

describe('hydrate-file-range', () => {
  beforeEach(() => {
    clearHydrationState();
    fileExistsOnDiskMock.mockResolvedValue(true);
    allocateFileMock.mockResolvedValue(undefined);
    downloadAndCacheBlockMock.mockResolvedValue({ data: undefined });
    readChunkFromDiskMock.mockResolvedValue(Buffer.from('data'));
  });

  it('hydrates the requested range without reading it back or marking it as an offline download', async () => {
    const result = await hydrateFileRange(createDeps());

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(downloadAndCacheBlockMock).toHaveBeenCalledOnce();
    expect(readChunkFromDiskMock).not.toHaveBeenCalled();
    expect(getExistingHydrationState(virtualFile.contentsId)?.finalized).toBe(false);
  });
});
