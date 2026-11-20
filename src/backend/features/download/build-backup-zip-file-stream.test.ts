import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { buildBackupZipFromRemoteContent } from './build-backup-zip-from-remote-content';
import { convertToWritableStream } from './stream';

describe('build-backup-zip-file-stream', () => {
  const props = {
    deviceName: 'Ubuntu',
    networkApiUrl: 'https://gateway.internxt.com',
    rootFolderUuid: 'root-uuid',
    tempFolderPath: '/tmp',
    bridgeUser: 'user',
    bridgePass: 'pass',
    encryptionKey: 'key',
  };

  async function createDestination() {
    const directory = await mkdtemp(join(tmpdir(), 'backup-zip-'));
    const fileHandle = await open(join(directory, 'out.zip'), 'w');
    const writeStream = fileHandle.createWriteStream();
    const destination = convertToWritableStream({ writeStream });

    return { directory, destination };
  }

  async function captureUncaughtErrors() {
    const errors: unknown[] = [];
    const onUncaught = (error: unknown) => {
      errors.push(error);
    };
    process.on('uncaughtException', onUncaught);

    return {
      errors,
      async stop() {
        await new Promise((resolve) => {
          setImmediate(resolve);
        });
        process.off('uncaughtException', onUncaught);
      },
    };
  }

  it('should abort the file stream without an uncaught error when size fetching throws', async () => {
    const { directory, destination } = await createDestination();
    const sizeError = new Error('stats request failed');
    const uncaught = await captureUncaughtErrors();

    try {
      await expect(
        buildBackupZipFromRemoteContent({
          ...props,
          destination,
          deps: {
            fetchTotalSize: vi.fn().mockRejectedValue(sizeError),
            fetchFolderContent: vi.fn(),
          },
        }),
      ).rejects.toBe(sizeError);

      await uncaught.stop();
      expect(uncaught.errors).toHaveLength(0);
    } finally {
      await uncaught.stop();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('should destroy the zip without an uncaught error when folder content cannot be fetched', async () => {
    const { directory, destination } = await createDestination();
    const fetchError = new DriveServerError('SERVER_ERROR', 500, 'fetch failed');
    const uncaught = await captureUncaughtErrors();

    try {
      await expect(
        buildBackupZipFromRemoteContent({
          ...props,
          destination,
          deps: {
            fetchTotalSize: vi.fn().mockResolvedValue({ data: 1 }),
            fetchFolderContent: vi.fn().mockResolvedValue({ error: fetchError }),
          },
        }),
      ).rejects.toBe(fetchError);

      await uncaught.stop();
      expect(uncaught.errors).toHaveLength(0);
    } finally {
      await uncaught.stop();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
