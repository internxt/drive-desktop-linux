import type { WriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { call } from '../../../../tests/vitest/utils.helper';

const {
  addFileMock,
  addFolderMock,
  closeMock,
  createReadStreamMock,
  createWriteStreamMock,
  downloadFileV2Mock,
  getBackupFolderTreeSnapshotMock,
  mkdirMock,
  mkdtempMock,
  openMock,
  rmMock,
} = vi.hoisted(() => {
  return {
    addFileMock: vi.fn(),
    addFolderMock: vi.fn(),
    closeMock: vi.fn().mockResolvedValue(undefined),
    createReadStreamMock: vi.fn(),
    createWriteStreamMock: vi.fn(),
    downloadFileV2Mock: vi.fn(),
    getBackupFolderTreeSnapshotMock: vi.fn(),
    mkdirMock: vi.fn(),
    mkdtempMock: vi.fn(),
    openMock: vi.fn(),
    rmMock: vi.fn(),
  };
});

vi.mock('node:fs', () => {
  return {
    createReadStream: createReadStreamMock,
  };
});

vi.mock('node:fs/promises', () => {
  return {
    mkdir: mkdirMock,
    mkdtemp: mkdtempMock,
    open: openMock,
    rm: rmMock,
  };
});

vi.mock('../../../apps/main/network/zip.service', () => {
  class FlatFolderZip {
    constructor() {
      // noop
    }

    async addFile(name: string, source: ReadableStream<Uint8Array>) {
      addFileMock(name, source);
    }

    addFolder(name: string) {
      addFolderMock(name);
    }

    async close() {
      return closeMock();
    }
  }

  return { FlatFolderZip };
});

vi.mock('./downloadv2', () => {
  return {
    default: downloadFileV2Mock,
  };
});

vi.mock('@internxt/lib', () => {
  return {
    items: {
      getItemDisplayName: ({ name }: { name: string }) => name,
    },
  };
});

vi.mock('../backup/get-backup-folder-tree-snapshot', () => {
  return {
    getBackupFolderTreeSnapshot: getBackupFolderTreeSnapshotMock,
  };
});

import { downloadFolderAsZip } from './download-folder-as-zip';

describe('download', () => {
  beforeEach(() => {
    const fakeWriteStream = {
      write: (_chunk: Buffer, cb?: (error?: Error | null) => void) => cb?.(null),
      end: (cb?: (error?: Error | null) => void) => cb?.(null),
      destroy: vi.fn(),
    } as unknown as WriteStream;

    createWriteStreamMock.mockReturnValue(fakeWriteStream);
    createReadStreamMock.mockImplementation(() => Readable.from([]));
    mkdtempMock.mockResolvedValue('/tmp/internxt-backup-download-test');
    mkdirMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
    openMock.mockResolvedValue({
      createWriteStream: createWriteStreamMock,
      close: vi.fn().mockResolvedValue(undefined),
    });
    downloadFileV2Mock.mockClear();
    addFileMock.mockClear();
    addFolderMock.mockClear();
    closeMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add empty file to zip without remote download when backup file has no fileId', async () => {
    getBackupFolderTreeSnapshotMock.mockResolvedValue({
      data: {
        tree: {
          id: 11,
          plainName: 'root',
          files: [
            {
              id: 77,
              type: '',
              bucket: 'bucket-id',
              fileId: null,
              size: '0',
            },
          ],
          children: [],
        },
        folderDecryptedNames: {
          11: 'Ubuntu',
        },
        fileDecryptedNames: {
          77: 'empty.txt',
        },
        size: 0,
      },
    });

    await downloadFolderAsZip(
      'Ubuntu',
      'https://gateway.internxt.com',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      {},
    );

    expect(downloadFileV2Mock).not.toHaveBeenCalled();
    call(addFolderMock).toBe('Ubuntu');
    expect(addFileMock).toHaveBeenCalledTimes(1);

    const addFileCall = addFileMock.mock.calls[0] as [string, ReadableStream<Uint8Array>];
    const fileName = addFileCall[0];
    const source = addFileCall[1];
    expect(fileName).toBe('Ubuntu/empty.txt');
    expect(source).toBeInstanceOf(ReadableStream);

    const reader = source.getReader();
    const firstRead = await reader.read();

    expect(firstRead.done).toBe(true);
  });

  it('should retry backup file download on 502 and then continue', async () => {
    getBackupFolderTreeSnapshotMock.mockResolvedValue({
      data: {
        tree: {
          id: 11,
          plainName: 'root',
          files: [
            {
              id: 77,
              type: '',
              bucket: 'bucket-id',
              fileId: 'file-id',
              size: '1',
            },
          ],
          children: [],
        },
        folderDecryptedNames: {
          11: 'Ubuntu',
        },
        fileDecryptedNames: {
          77: 'remote.txt',
        },
        size: 1,
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({ response: { status: 502 }, message: 'bad gateway' })
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip(
      'Ubuntu',
      'https://gateway.internxt.com',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      {},
    );

    await downloadPromise;

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when 502 status is at root level in sdk error', async () => {
    getBackupFolderTreeSnapshotMock.mockResolvedValue({
      data: {
        tree: {
          id: 11,
          plainName: 'root',
          files: [
            {
              id: 77,
              type: '',
              bucket: 'bucket-id',
              fileId: 'file-id',
              size: '1',
            },
          ],
          children: [],
        },
        folderDecryptedNames: {
          11: 'Ubuntu',
        },
        fileDecryptedNames: {
          77: 'remote.txt',
        },
        size: 1,
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({ status: 502, message: 'Request failed with status code 502' })
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip(
      'Ubuntu',
      'https://gateway.internxt.com',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      {},
    );

    await downloadPromise;

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when content length mismatch happens', async () => {
    getBackupFolderTreeSnapshotMock.mockResolvedValue({
      data: {
        tree: {
          id: 11,
          plainName: 'root',
          files: [
            {
              id: 77,
              type: '',
              bucket: 'bucket-id',
              fileId: 'file-id',
              size: '1',
            },
          ],
          children: [],
        },
        folderDecryptedNames: {
          11: 'Ubuntu',
        },
        fileDecryptedNames: {
          77: 'remote.txt',
        },
        size: 1,
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({
        code: 'ERR_CONTENT_LENGTH_MISMATCH',
        message: 'net::ERR_CONTENT_LENGTH_MISMATCH',
      })
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip(
      'Ubuntu',
      'https://gateway.internxt.com',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      {},
    );

    await downloadPromise;

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when empty response connection reset happens', async () => {
    getBackupFolderTreeSnapshotMock.mockResolvedValue({
      data: {
        tree: {
          id: 11,
          plainName: 'root',
          files: [
            {
              id: 77,
              type: '',
              bucket: 'bucket-id',
              fileId: 'file-id',
              size: '1',
            },
          ],
          children: [],
        },
        folderDecryptedNames: {
          11: 'Ubuntu',
        },
        fileDecryptedNames: {
          77: 'remote.txt',
        },
        size: 1,
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({
        code: 'ECONNRESET',
        message: 'FetchError: failed, reason: net::ERR_EMPTY_RESPONSE',
      })
      .mockResolvedValueOnce(createEmptyStream());

    await downloadFolderAsZip(
      'Ubuntu',
      'https://gateway.internxt.com',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      {},
    );

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when request times out', async () => {
    getBackupFolderTreeSnapshotMock.mockResolvedValue({
      data: {
        tree: {
          id: 11,
          plainName: 'root',
          files: [
            {
              id: 77,
              type: '',
              bucket: 'bucket-id',
              fileId: 'file-id',
              size: '1',
            },
          ],
          children: [],
        },
        folderDecryptedNames: {
          11: 'Ubuntu',
        },
        fileDecryptedNames: {
          77: 'remote.txt',
        },
        size: 1,
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({
        code: 'ERR_TIMED_OUT',
        message: 'FetchError: failed, reason: net::ERR_TIMED_OUT',
      })
      .mockResolvedValueOnce(createEmptyStream());

    await downloadFolderAsZip(
      'Ubuntu',
      'https://gateway.internxt.com',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      {},
    );

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry failed file before adding it to zip', async () => {
    getBackupFolderTreeSnapshotMock.mockResolvedValue({
      data: {
        tree: {
          id: 11,
          plainName: 'root',
          files: [
            {
              id: 77,
              type: '',
              bucket: 'bucket-id',
              fileId: 'file-a',
              size: '1',
            },
            {
              id: 78,
              type: '',
              bucket: 'bucket-id',
              fileId: 'file-b',
              size: '1',
            },
          ],
          children: [],
        },
        folderDecryptedNames: {
          11: 'Ubuntu',
        },
        fileDecryptedNames: {
          77: 'a.txt',
          78: 'b.txt',
        },
        size: 2,
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({ status: 502, message: 'Request failed with status code 502' })
      .mockResolvedValueOnce(createEmptyStream())
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip(
      'Ubuntu',
      'https://gateway.internxt.com',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      {},
    );

    await downloadPromise;

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(3);
    expect(addFileMock).toHaveBeenCalledTimes(2);
    expect(createReadStreamMock).toHaveBeenCalledTimes(2);
  });
});

function createEmptyStream() {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
}
