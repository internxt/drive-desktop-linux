import { PassThrough } from 'node:stream';
import { handleReadCallback, type HandleReadCallbackDeps } from './handle-read-callback';
import * as readChunkModule from './read-chunk-from-disk';
import * as createDownloadModule from './create-download-to-disk';
import * as hydrationRegistryModule from './hydration-registry';
import * as openFlagsTrackerModule from '../on-open/open-flags-tracker';
import { partialSpyOn, call } from '../../../../../tests/vitest/utils.helper';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { FuseNoSuchFileOrDirectoryError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';

const readChunkFromDiskMock = partialSpyOn(readChunkModule, 'readChunkFromDisk');
const createDownloadToDiskMock = partialSpyOn(createDownloadModule, 'createDownloadToDisk');
const getHydrationMock = partialSpyOn(hydrationRegistryModule, 'getHydration');
const setHydrationMock = partialSpyOn(hydrationRegistryModule, 'setHydration');
const shouldDownloadMock = partialSpyOn(openFlagsTrackerModule, 'shouldDownload');

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
    readTemporalFileChunk: vi.fn().mockResolvedValue(undefined),
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
    shouldDownloadMock.mockReturnValue(true);
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

      const result = await handleReadCallback(deps, '/file.txt', 10, 0);

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toBeInstanceOf(FuseNoSuchFileOrDirectoryError);
    });

    it('should read from temporal file when virtual file is not found but temporal exists', async () => {
      const chunk = Buffer.from('temporal-data');
      const deps = createDeps({
        findVirtualFile: vi.fn().mockResolvedValue(undefined),
        findTemporalFile: vi.fn().mockResolvedValue({ path: { value: '/tmp/internxt/uuid' } }),
        readTemporalFileChunk: vi.fn().mockResolvedValue(chunk),
      });

      const result = await handleReadCallback(deps, '/file.txt', 13, 0);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(chunk);
      call(deps.readTemporalFileChunk as ReturnType<typeof vi.fn>).toStrictEqual(['/tmp/internxt/uuid', 13, 0]);
    });

    it('should return empty buffer when temporal file chunk is undefined', async () => {
      const deps = createDeps({
        findVirtualFile: vi.fn().mockResolvedValue(undefined),
        findTemporalFile: vi.fn().mockResolvedValue({ path: { value: '/tmp/internxt/uuid' } }),
        readTemporalFileChunk: vi.fn().mockResolvedValue(undefined),
      });

      const result = await handleReadCallback(deps, '/file.txt', 10, 0);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toHaveLength(0);
    });
  });

  describe('when shouldDownload returns false', () => {
    it('should return empty buffer', async () => {
      shouldDownloadMock.mockReturnValue(false);
      const deps = createDeps();

      const result = await handleReadCallback(deps, '/file.mp4', 10, 0);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toHaveLength(0);
    });
  });

  describe('when file already exists on disk', () => {
    it('should read chunk directly from disk', async () => {
      const chunk = Buffer.from('cached');
      readChunkFromDiskMock.mockResolvedValue(chunk);
      const deps = createDeps({
        existsOnDisk: vi.fn().mockResolvedValue(true),
      });

      const result = await handleReadCallback(deps, '/file.mp4', 6, 100);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(chunk);
      expect(deps.startDownload).not.toHaveBeenCalled();
    });
  });

  describe('when file needs to be downloaded', () => {
    it('should start a new hydration when none exists', async () => {
      const writer = createWriterMock();
      createDownloadToDiskMock.mockReturnValue(writer);
      const deps = createDeps();

      await handleReadCallback(deps, '/file.mp4', 10, 50);

      expect(deps.startDownload).toHaveBeenCalledWith(virtualFile);
      expect(setHydrationMock).toHaveBeenCalledOnce();
      expect(writer.waitForBytes).toHaveBeenCalledWith(50, 10);
    });

    it('should reuse existing hydration when one exists', async () => {
      const writer = createWriterMock();
      getHydrationMock.mockReturnValue({ writer });
      const deps = createDeps();

      await handleReadCallback(deps, '/file.mp4', 10, 50);

      expect(deps.startDownload).not.toHaveBeenCalled();
      expect(writer.waitForBytes).toHaveBeenCalledWith(50, 10);
    });

    it('should read chunk from disk after waitForBytes resolves', async () => {
      const chunk = Buffer.from('downloaded');
      readChunkFromDiskMock.mockResolvedValue(chunk);
      const deps = createDeps();

      const result = await handleReadCallback(deps, '/file.mp4', 10, 0);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(chunk);
    });

    it('should skip waitForBytes when bytes are already available', async () => {
      const writer = createWriterMock(1000);
      getHydrationMock.mockReturnValue({ writer });
      const deps = createDeps();

      await handleReadCallback(deps, '/file.mp4', 10, 50);

      expect(writer.waitForBytes).toHaveBeenCalledWith(50, 10);
    });
  });
});
