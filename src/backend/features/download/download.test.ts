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
  fetchFolderMock,
  fetchFolderTotalSizeMock,
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
    fetchFolderMock: vi.fn(),
    fetchFolderTotalSizeMock: vi.fn(),
    mkdirMock: vi.fn(),
    mkdtempMock: vi.fn(),
    openMock: vi.fn(),
    rmMock: vi.fn(),
  };
});

vi.mock('../../../infra/drive-server/services/folder/services/fetch-folder', () => ({
  fetchFolder: fetchFolderMock,
}));

vi.mock('../../../infra/drive-server/services/folder/services/fetch-folder-total-size-bytes', () => ({
  fetchFolderTotalSizeBytes: fetchFolderTotalSizeMock,
}));

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

import { downloadFolderAsZip } from './download-folder-as-zip';

const existingFile = {
  status: 'EXISTS' as const,
};

const existingFolder = {
  status: 'EXISTS' as const,
  deleted: false,
  removed: false,
};

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
    fetchFolderMock.mockReset();
    fetchFolderTotalSizeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add empty file to zip without remote download when backup file has no fileId', async () => {
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 0 });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [],
        files: [
          {
            ...existingFile,
            plainName: 'empty.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: null,
            size: '0',
            uuid: 'file-uuid',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
        ],
      },
    });

    await downloadFolderAsZip({
      deviceName: 'Ubuntu',
      networkApiUrl: 'https://gateway.internxt.com',
      rootFolderUuid: 'root-uuid',
      fullPath: '/tmp/backup.zip',
      environment: {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      opts: {},
    });

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
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 1 });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [],
        files: [
          {
            ...existingFile,
            plainName: 'remote.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: 'file-id',
            size: '1',
            uuid: 'file-uuid',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
        ],
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({ response: { status: 502 }, message: 'bad gateway' })
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip({
      deviceName: 'Ubuntu',
      networkApiUrl: 'https://gateway.internxt.com',
      rootFolderUuid: 'root-uuid',
      fullPath: '/tmp/backup.zip',
      environment: {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      opts: {},
    });

    await downloadPromise;

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when 502 status is at root level in sdk error', async () => {
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 1 });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [],
        files: [
          {
            ...existingFile,
            plainName: 'remote.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: 'file-id',
            size: '1',
            uuid: 'file-uuid',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
        ],
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({ status: 502, message: 'Request failed with status code 502' })
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip({
      deviceName: 'Ubuntu',
      networkApiUrl: 'https://gateway.internxt.com',
      rootFolderUuid: 'root-uuid',
      fullPath: '/tmp/backup.zip',
      environment: {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      opts: {},
    });

    await downloadPromise;

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when content length mismatch happens', async () => {
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 1 });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [],
        files: [
          {
            ...existingFile,
            plainName: 'remote.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: 'file-id',
            size: '1',
            uuid: 'file-uuid',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
        ],
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({
        code: 'ERR_CONTENT_LENGTH_MISMATCH',
        message: 'net::ERR_CONTENT_LENGTH_MISMATCH',
      })
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip({
      deviceName: 'Ubuntu',
      networkApiUrl: 'https://gateway.internxt.com',
      rootFolderUuid: 'root-uuid',
      fullPath: '/tmp/backup.zip',
      environment: {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      opts: {},
    });

    await downloadPromise;

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when empty response connection reset happens', async () => {
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 1 });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [],
        files: [
          {
            ...existingFile,
            plainName: 'remote.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: 'file-id',
            size: '1',
            uuid: 'file-uuid',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
        ],
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({
        code: 'ECONNRESET',
        message: 'FetchError: failed, reason: net::ERR_EMPTY_RESPONSE',
      })
      .mockResolvedValueOnce(createEmptyStream());

    await downloadFolderAsZip({
      deviceName: 'Ubuntu',
      networkApiUrl: 'https://gateway.internxt.com',
      rootFolderUuid: 'root-uuid',
      fullPath: '/tmp/backup.zip',
      environment: {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      opts: {},
    });

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry when request times out', async () => {
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 1 });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [],
        files: [
          {
            ...existingFile,
            plainName: 'remote.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: 'file-id',
            size: '1',
            uuid: 'file-uuid',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
        ],
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({
        code: 'ERR_TIMED_OUT',
        message: 'FetchError: failed, reason: net::ERR_TIMED_OUT',
      })
      .mockResolvedValueOnce(createEmptyStream());

    await downloadFolderAsZip({
      deviceName: 'Ubuntu',
      networkApiUrl: 'https://gateway.internxt.com',
      rootFolderUuid: 'root-uuid',
      fullPath: '/tmp/backup.zip',
      environment: {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      opts: {},
    });

    expect(downloadFileV2Mock).toHaveBeenCalledTimes(2);
  });

  it('should retry failed file before adding it to zip', async () => {
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 2 });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [],
        files: [
          {
            ...existingFile,
            plainName: 'a.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: 'file-a',
            size: '1',
            uuid: 'fa',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
          {
            ...existingFile,
            plainName: 'b.txt',
            type: '',
            bucket: 'bucket-id',
            fileId: 'file-b',
            size: '1',
            uuid: 'fb',
            folderId: 1,
            folderUuid: 'root-uuid',
          },
        ],
      },
    });

    downloadFileV2Mock
      .mockRejectedValueOnce({ status: 502, message: 'Request failed with status code 502' })
      .mockResolvedValueOnce(createEmptyStream())
      .mockResolvedValueOnce(createEmptyStream());

    const downloadPromise = downloadFolderAsZip({
      deviceName: 'Ubuntu',
      networkApiUrl: 'https://gateway.internxt.com',
      rootFolderUuid: 'root-uuid',
      fullPath: '/tmp/backup.zip',
      environment: {
        bridgeUser: 'bridge-user',
        bridgePass: 'bridge-pass',
        encryptionKey: 'mnemonic',
      },
      opts: {},
    });

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
