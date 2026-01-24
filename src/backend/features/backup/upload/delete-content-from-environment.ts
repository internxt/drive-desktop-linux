import { logger } from '@internxt/drive-desktop-core/build/backend';
import { deleteFileFromStorageByFileId } from '../../../../infra/drive-server/services/files/services/delete-file-content-from-bucket';

/**
 * Delete content from storage bucket (cleanup on metadata creation failure)
 */
export async function deleteContentFromEnvironment(bucket: string, contentsId: string): Promise<void> {
  try {
    await deleteFileFromStorageByFileId({ bucketId: bucket, fileId: contentsId });
  } catch {
    logger.error({ tag: 'BACKUPS', msg: 'Could not delete the file from the bucket', contentsId });
  }
}
