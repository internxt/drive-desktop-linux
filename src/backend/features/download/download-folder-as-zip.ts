import { PathLike } from 'node:fs';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { buildBackupZipFromRemoteContent } from './build-backup-zip-from-remote-content';
import { convertToWritableStream } from './stream';

export { buildProgressStream, getDecryptedStream } from './stream';
export type { DownloadProgressCallback, IDownloadParams } from './download.types';

type Props = {
  deviceName: string;
  networkApiUrl: string;
  rootFolderUuid: string;
  fullPath: PathLike;
  environment: {
    bridgeUser: string;
    bridgePass: string;
    encryptionKey: string;
  };
  opts: {
    abortController?: AbortController;
    updateProgress?: (progress: number) => void;
  };
};

export async function downloadFolderAsZip({
  deviceName,
  networkApiUrl,
  rootFolderUuid,
  fullPath,
  environment,
  opts,
}: Props) {
  const outputFileHandle = await open(fullPath, 'w');
  const writeStream = outputFileHandle.createWriteStream();
  const destination = convertToWritableStream({ writeStream });

  const { abortController, updateProgress } = opts;
  const { bridgeUser, bridgePass, encryptionKey } = environment;
  const tempFolderPath = await mkdtemp(join(tmpdir(), 'internxt-backup-download-'));

  try {
    return await buildBackupZipFromRemoteContent({
      deviceName,
      networkApiUrl,
      rootFolderUuid,
      destination,
      tempFolderPath,
      bridgeUser,
      bridgePass,
      encryptionKey,
      abortController,
      updateProgress,
    });
  } catch (error) {
    throw logger.error({ tag: 'BACKUPS', msg: 'Error building backup zip from remote folder content', error });
  } finally {
    await rm(tempFolderPath, { recursive: true, force: true });
  }
}
