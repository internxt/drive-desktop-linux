import { resolve } from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../../core/electron/paths';
import type { File } from '../../../../context/virtual-drive/files/domain/File';
import { canGenerateThumbnail } from '../thumbnail.extensions';
import { generateThumbnailVariantsFromPath } from '../generate-thumbnail';
import { invalidateSystemThumbnail } from './invalidate-system-thumbnail';
import { writeSystemThumbnail } from './write-system-thumbnail';

type CreateSystemThumbnailProps = {
  readonly file: File;
  readonly sourceFilePath: string;
};

export async function createSystemThumbnail({ file, sourceFilePath }: CreateSystemThumbnailProps): Promise<boolean> {
  const systemFilePath = resolve(PATHS.ROOT_DRIVE_FOLDER, file.path.replace(/^\/+/, ''));
  if (!systemFilePath.startsWith(PATHS.ROOT_DRIVE_FOLDER)) {
    logger.warn({ msg: '[THUMBNAIL QUEUE] Path traversal attempt detected', path: file.path });
    return false;
  }

  if (!canGenerateThumbnail(file.type)) {
    await invalidateSystemThumbnail({ filePath: systemFilePath });
    return true;
  }

  const generated = await generateThumbnailVariantsFromPath({ filePath: sourceFilePath });
  if (generated.error) {
    logger.warn({
      msg: '[THUMBNAIL QUEUE] Could not generate image thumbnail from hydrated media',
      file: file.nameWithExtension,
      sourceFilePath,
      fileSize: file.size,
      error: generated.error,
    });
    return false;
  }

  const writeResult = await writeSystemThumbnail({
    filePath: systemFilePath,
    fileSize: file.size,
    modificationTime: file.modificationTime,
    thumbnails: generated.data,
  });

  if (writeResult.error) {
    logger.warn({
      msg: '[THUMBNAIL QUEUE] Could not persist generated image thumbnail',
      file: file.nameWithExtension,
      error: writeResult.error,
    });
    return false;
  }

  return true;
}
