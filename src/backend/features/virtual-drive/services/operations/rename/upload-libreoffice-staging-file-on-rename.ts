import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { FuseIOError } from '../../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { TemporalFileByPathFinder } from '../../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { DeleteTemporalFileIfUnchanged } from '../../../../../../context/storage/TemporalFiles/application/deletion/DeleteTemporalFileIfUnchanged';
import { moveTemporalFile } from '../../../../../../context/storage/TemporalFiles/application/move/move-temporal-file';
import { TemporalFileUploader } from '../../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploader';
import { TemporalFileRepository } from '../../../../../../context/storage/TemporalFiles/domain/TemporalFileRepository';
import { acquireUploadSlot } from '../../../../../../context/storage/TemporalFiles/application/upload/upload-concurrency-limiter';

type Props = {
  src: string;
  dest: string;
  container: Container;
};

/**
 * LibreOffice renames `lu<random>.tmp` onto the document name once the bytes
 * are written. The staged copy is filed under the temp name, and a drive file
 * created from that path would be the temp name, so the copy is re-filed under
 * the destination before the upload.
 */
export async function uploadLibreOfficeStagingFileOnRename({ src, dest, container }: Props) {
  const repository = container.get(TemporalFileRepository);

  try {
    await moveTemporalFile({ repository, from: src, to: dest });
  } catch (error) {
    logger.error({
      msg: '[UPLOAD ON RENAME] Could not move LibreOffice staging file onto its destination',
      error,
      src,
      dest,
    });
    return { error: new FuseIOError('Could not move the LibreOffice staging file.') };
  }

  const document = await container.get(TemporalFileByPathFinder).run(dest);

  if (!document) {
    return { error: new FuseIOError('LibreOffice staging file disappeared after it was renamed.') };
  }

  const releaseUploadSlot = await acquireUploadSlot();

  // The revision has to be the one the uploader read immediately before it
  // bounded the bytes. The copy found above can be older: a write during the
  // space check is what the upload sends, and reaping against that earlier
  // revision would keep a staged copy whose bytes are already in the cloud.
  let uploadedRevision: number | undefined;

  try {
    ({ uploadedRevision } = await container.get(TemporalFileUploader).run(document));
  } catch (error) {
    logger.error({
      msg: '[UPLOAD ON RENAME] Upload of renamed LibreOffice staging file failed',
      error,
      src,
      dest,
    });

    try {
      await moveTemporalFile({ repository, from: dest, to: src });
    } catch (moveBackError) {
      logger.error({
        msg: '[UPLOAD ON RENAME] Could not restore LibreOffice staging file after a failed upload',
        error: moveBackError,
        src,
        dest,
      });
    }

    return { error: new FuseIOError('Upload of the LibreOffice document failed.') };
  } finally {
    releaseUploadSlot();
  }

  // A write that lands after that read bumps the staged revision. Those bytes
  // never rode this upload, and the staged copy is what makes the next close
  // send them. Same guard as create and override: delete only on a match,
  // and keep the copy when the revision is missing or different.
  await container.get(DeleteTemporalFileIfUnchanged).run(dest, uploadedRevision);
  return { data: undefined };
}
