import { PassThrough } from 'node:stream';
import { handleReadCallback, type HandleReadCallbackDeps } from './handle-read-callback';
import * as readChunkModule from './read-chunk-from-disk';
import * as createDownloadModule from './create-download-to-disk';
import * as hydrationRegistryModule from './hydration-registry';
import * as processBlocklistModule from '../../../features/virtual-drive/utils/process-blocklist';
import { partialSpyOn, call } from '../../../../../tests/vitest/utils.helper';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { FuseNoSuchFileOrDirectoryError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';

const readChunkFromDiskMock = partialSpyOn(readChunkModule, 'readChunkFromDisk');
const createDownloadToDiskMock = partialSpyOn(createDownloadModule, 'createDownloadToDisk');
const getHydrationMock = partialSpyOn(hydrationRegistryModule, 'getHydration');
const setHydrationMock = partialSpyOn(hydrationRegistryModule, 'setHydration');
const isBlocklistedProcessMock = partialSpyOn(processBlocklistModule, 'isBlocklistedProcess');

const virtualFile = {
  contentsId: 'contents-123',
  name: 'video.mp4',
  nameWithExtension: 'video.mp4',
  type: 'mp4',
  uuid: 'uuid-123',
  size: 1000,
} as unknown as File;

function createDeps(overrides: Partial<HandleReadCallbackDeps> = {}): HandleReadCallbackDeps {
  return {
    findVirtualFile: vi.fn().mockResolvedValue(virtualFile),
    findTemporalFile: vi.fn().mockResolvedValue(undefined),
    existsOnDisk: vi.fn().mockResolvedValue(false),
    startDownload: vi.fn().mockResolvedValue({ stream: new PassThrough(), elapsedTime: () => 0 }),
    onDownloadProgress: vi.fn(),
    saveToRepository: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createWriterMock(bytesAvailable = 0) {
  return {
    waitForBytes: vi.fn().mockResolvedValue(undefined),
    getBytesAvailable: vi.fn().mockReturnValue(bytesAvailable),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

describe('handleReadCallback', () => {
  beforeEach(() => {
    isBlocklistedProcessMock.mockReturnValue(false);
    getHydrationMock.mockReturnValue(undefined);
    readChunkFromDiskMock.mockResolvedValue(Buffer.from('data'));
    createDownloadToDiskMock.mockReturnValue(createWriterMock());
  });

  describe('when virtual file is not found', () => {
    it('should return ENOENT when neither virtual nor temporal file exists', async () => {
      const deps = createDeps({
        findVirtualFile: vi.fn().mockResolvedValue(undefined),
        findTemporalFile: vi.fn().mockResolvedValue(undefined),
      });

      const result = await handleReadCallback(deps, '/file.txt', 10, 0, 'vlc');

      expect(result.error).toBeInstanceOf(FuseNoSuchFileOrDirectoryError);
    });

    it('should read from temporal file when virtual file is not found but temporal exists', async () => {
      const chunk = Buffer.from('temporal-data');
      readChunkFromDiskMock.mockResolvedValue(chunk);
      const deps = createDeps({
        findVirtualFile: vi.fn().mockResolvedValue(undefined),
        findTemporalFile: vi.fn().mockResolvedValue({
          path: { value: '/virtual/file.txt' },
          contentFilePath: '/tmp/internxt-drive-tmp/uuid',
        }),
      });

      const result = await handleReadCallback(deps, '/file.txt', 13, 0, 'vlc');

      expect(result.data).toBe(chunk);
      call(readChunkFromDiskMock).toStrictEqual(['/tmp/internxt-drive-tmp/uuid', 13, 0]);
    });

    it('should return ENOENT when temporal file has no content path', async () => {
      const deps = createDeps({
        findVirtualFile: vi.fn().mockResolvedValue(undefined),
        findTemporalFile: vi.fn().mockResolvedValue({ path: { value: '/virtual/file.txt' } }),
      });

      const result = await handleReadCallback(deps, '/file.txt', 10, 0, 'vlc');

      expect(result.error).toBeInstanceOf(FuseNoSuchFileOrDirectoryError);
    });
  });

  describe('when process is blocklisted', () => {
    it('should return empty buffer when file is not on disk', async () => {
      isBlocklistedProcessMock.mockReturnValue(true);
      const deps = createDeps({ existsOnDisk: vi.fn().mockResolvedValue(false) });

      const result = await handleReadCallback(deps, '/file.mp4', 10, 0, 'pool-org.gnome.');

      expect(result.data).toHaveLength(0);
      expect(deps.startDownload).not.toHaveBeenCalled();
    });

    it('should serve from disk when file is already downloaded', async () => {
      isBlocklistedProcessMock.mockReturnValue(true);
      const chunk = Buffer.from('cached');
      readChunkFromDiskMock.mockResolvedValue(chunk);
      const deps = createDeps({ existsOnDisk: vi.fn().mockResolvedValue(true) });

      const result = await handleReadCallback(deps, '/file.mp4', 6, 0, 'pool-org.gnome.');

      expect(result.data).toBe(chunk);
      expect(deps.startDownload).not.toHaveBeenCalled();
    });
  });

  describe('when file needs to be downloaded', () => {
    it('should start a new hydration when none exists', async () => {
      const writer = createWriterMock();
      createDownloadToDiskMock.mockReturnValue(writer);
      const deps = createDeps();

      await handleReadCallback(deps, '/file.mp4', 10, 50, 'vlc');

      expect(deps.startDownload).toHaveBeenCalledWith(virtualFile);
      expect(setHydrationMock).toHaveBeenCalledOnce();
      expect(writer.waitForBytes).toHaveBeenCalledWith(50, 10);
    });

    it('should reuse existing hydration when one exists', async () => {
      const writer = createWriterMock();
      getHydrationMock.mockReturnValue({ writer });
      const deps = createDeps();

      await handleReadCallback(deps, '/file.mp4', 10, 50, 'vlc');

      expect(deps.startDownload).not.toHaveBeenCalled();
      expect(writer.waitForBytes).toHaveBeenCalledWith(50, 10);
    });

    it('should read chunk from disk after waitForBytes resolves', async () => {
      const chunk = Buffer.from('downloaded');
      readChunkFromDiskMock.mockResolvedValue(chunk);
      const deps = createDeps();

      const result = await handleReadCallback(deps, '/file.mp4', 10, 0, 'vlc');

      expect(result.data).toBe(chunk);
    });

    it('should skip waitForBytes when bytes are already available', async () => {
      const writer = createWriterMock(1000);
      getHydrationMock.mockReturnValue({ writer });
      const deps = createDeps();

      await handleReadCallback(deps, '/file.mp4', 10, 50, 'vlc');

      expect(writer.waitForBytes).toHaveBeenCalledWith(50, 10);
    });
  });
});
