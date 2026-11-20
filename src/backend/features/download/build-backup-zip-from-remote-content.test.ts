import { WritableStream } from 'node:stream/web';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { call, calls } from '../../../../tests/vitest/utils.helper';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';
import { buildBackupZipFromRemoteContent } from './build-backup-zip-from-remote-content';

const { addFileMock, addFolderMock, closeMock, destroyMock } = vi.hoisted(() => {
  return {
    addFileMock: vi.fn(),
    addFolderMock: vi.fn(),
    closeMock: vi.fn(),
    destroyMock: vi.fn(),
  };
});

vi.mock('../../../apps/main/network/zip.service', () => {
  class FlatFolderZip {
    private readonly onProgress?: (loadedBytes: number) => void;

    constructor(_destination: unknown, opts: { progress?: (loadedBytes: number) => void }) {
      this.onProgress = opts.progress;
    }

    addFolder(name: string) {
      addFolderMock(name);
    }

    async addFile() {
      return addFileMock();
    }

    async close() {
      this.onProgress?.(10);
      return closeMock();
    }

    destroy() {
      destroyMock();
    }
  }

  return { FlatFolderZip };
});

describe('build-backup-zip-from-remote-content', () => {
  const statsError = new DriveServerError('UNKNOWN', 500, 'stats failed');

  const props = {
    deviceName: 'Ubuntu',
    networkApiUrl: 'https://gateway.internxt.com',
    rootFolderUuid: 'root-uuid',
    destination: undefined as never,
    tempFolderPath: '/tmp',
    bridgeUser: 'user',
    bridgePass: 'pass',
    encryptionKey: 'key',
  };

  beforeEach(() => {
    addFileMock.mockResolvedValue(undefined);
    closeMock.mockResolvedValue(undefined);
  });

  it('should keep traversing and mark progress complete when folder stats fail', async () => {
    const updateProgress = vi.fn();
    const fetchFolderContent = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          files: [],
          children: [
            {
              uuid: 'child-uuid',
              plainName: 'Docs',
              status: 'EXISTS',
              deleted: false,
              removed: false,
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { files: [], children: [] } });

    await buildBackupZipFromRemoteContent({
      ...props,
      updateProgress,
      deps: {
        fetchTotalSize: vi.fn().mockResolvedValue({ error: statsError }),
        fetchFolderContent,
      },
    });

    expect(fetchFolderContent).toHaveBeenCalledTimes(2);
    calls(addFolderMock).toStrictEqual(['Ubuntu', 'Ubuntu/Docs']);
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(destroyMock).not.toHaveBeenCalled();
    expect(updateProgress).toHaveBeenNthCalledWith(1, 0);
    expect(updateProgress).toHaveBeenLastCalledWith(1);
    call(loggerMock.error).toMatchObject({
      tag: 'BACKUPS',
      msg: 'Failed to fetch backup folder size for zip progress',
      error: statsError,
    });
  });

  it('should not mark progress complete when stats fail and the download is aborted before close', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const updateProgress = vi.fn();
    const fetchFolderContent = vi.fn();

    await expect(
      buildBackupZipFromRemoteContent({
        ...props,
        abortController,
        updateProgress,
        deps: {
          fetchTotalSize: vi.fn().mockResolvedValue({ error: statsError }),
          fetchFolderContent,
        },
      }),
    ).rejects.toThrow('Download cancelled');

    expect(fetchFolderContent).not.toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
    expect(destroyMock).toHaveBeenCalledTimes(1);
    expect(updateProgress).not.toHaveBeenCalled();
  });

  it('should not mark progress complete when stats fail and the download is aborted during close', async () => {
    const abortController = new AbortController();
    const updateProgress = vi.fn();
    closeMock.mockImplementation(async () => {
      abortController.abort();
    });

    await buildBackupZipFromRemoteContent({
      ...props,
      abortController,
      updateProgress,
      deps: {
        fetchTotalSize: vi.fn().mockResolvedValue({ error: statsError }),
        fetchFolderContent: vi.fn().mockResolvedValue({ data: { files: [], children: [] } }),
      },
    });

    expect(updateProgress).toHaveBeenCalledTimes(1);
    expect(updateProgress).toHaveBeenCalledWith(0);
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it('should not force progress complete when folder stats succeed', async () => {
    const updateProgress = vi.fn();

    await buildBackupZipFromRemoteContent({
      ...props,
      updateProgress,
      deps: {
        fetchTotalSize: vi.fn().mockResolvedValue({ data: 100 }),
        fetchFolderContent: vi.fn().mockResolvedValue({ data: { files: [], children: [] } }),
      },
    });

    expect(updateProgress).toHaveBeenLastCalledWith(0.1);
    expect(updateProgress).not.toHaveBeenCalledWith(1);
    expect(destroyMock).not.toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('should destroy the zip when folder content cannot be fetched', async () => {
    const fetchError = new DriveServerError('SERVER_ERROR', 500, 'fetch failed');

    await expect(
      buildBackupZipFromRemoteContent({
        ...props,
        deps: {
          fetchTotalSize: vi.fn().mockResolvedValue({ data: 1 }),
          fetchFolderContent: vi.fn().mockResolvedValue({ error: fetchError }),
        },
      }),
    ).rejects.toBe(fetchError);

    expect(closeMock).not.toHaveBeenCalled();
    expect(destroyMock).toHaveBeenCalledTimes(1);
    call(loggerMock.error).toMatchObject({
      tag: 'BACKUPS',
      msg: 'Failed to fetch folder content for backup zip',
      error: fetchError,
    });
  });

  it('should destroy the zip when adding a file fails', async () => {
    addFileMock.mockRejectedValue(new Error('add failed'));

    await expect(
      buildBackupZipFromRemoteContent({
        ...props,
        deps: {
          fetchTotalSize: vi.fn().mockResolvedValue({ data: 0 }),
          fetchFolderContent: vi.fn().mockResolvedValue({
            data: {
              files: [
                {
                  uuid: 'file-uuid',
                  plainName: 'empty.txt',
                  type: '',
                  bucket: 'bucket',
                  fileId: null,
                  size: '0',
                  status: 'EXISTS',
                },
              ],
              children: [],
            },
          }),
        },
      }),
    ).rejects.toThrow('add failed');

    expect(closeMock).not.toHaveBeenCalled();
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it('should abort the output stream and keep the original error when size fetching throws before the archive exists', async () => {
    const sizeError = new Error('stats request failed');
    let abortReason: unknown;
    const destination = new WritableStream<Uint8Array>({
      write() {
        return undefined;
      },
      abort(reason) {
        abortReason = reason;
      },
    });

    await expect(
      buildBackupZipFromRemoteContent({
        ...props,
        destination: destination as never,
        deps: {
          fetchTotalSize: vi.fn().mockRejectedValue(sizeError),
          fetchFolderContent: vi.fn(),
        },
      }),
    ).rejects.toBe(sizeError);

    expect(destroyMock).not.toHaveBeenCalled();
    expect(abortReason).toBe(sizeError);
  });
});
