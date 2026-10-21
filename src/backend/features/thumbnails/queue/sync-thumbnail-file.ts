import { join } from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { Container } from 'diod';
import { FirstsFileSearcher } from '../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { FileStatuses } from '../../../../context/virtual-drive/files/domain/FileStatus';
import { createSystemThumbnail } from './create-system-thumbnail';
import { ensureThumbnailSource } from './ensure-thumbnail-source';

type SyncThumbnailFileProps = {
  readonly fileName: string;
  readonly folderPath: string;
  readonly container: Container;
  readonly bucketId: string;
  readonly mnemonic: string;
  readonly network: Parameters<typeof ensureThumbnailSource>[0]['network'];
};

export async function syncThumbnailFile({
  fileName,
  folderPath,
  container,
  bucketId,
  mnemonic,
  network,
}: SyncThumbnailFileProps) {
  try {
    const file = await container.get(FirstsFileSearcher).run({
      path: join(folderPath, fileName),
      status: FileStatuses.EXISTS,
    });
    if (!file || file.size <= 0) return true;

    const source = await ensureThumbnailSource({ file, bucketId, mnemonic, network });
    if (source.error) {
      logger.warn({
        msg: '[THUMBNAIL QUEUE] Failed to hydrate media file for thumbnail generation',
        file: file.nameWithExtension,
        error: source.error,
      });
      return false;
    }

    if (!(await createSystemThumbnail({ file, sourceFilePath: source.data }))) return false;

    logger.debug({
      msg: '[THUMBNAIL QUEUE] Media file is ready for thumbnail generation',
      file: file.nameWithExtension,
    });
    return true;
  } catch (error) {
    logger.warn({
      msg: '[THUMBNAIL QUEUE] Failed to sync media file thumbnail',
      folderPath,
      fileName,
      error,
    });
    return false;
  }
}
