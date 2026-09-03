import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Container } from 'diod';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { Result } from '../../../../../context/shared/domain/Result';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { PendingModificationTimes } from '../../../../../context/virtual-drive/files/application/utimens/PendingModificationTimes';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { SingleFolderMatchingSearcher } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingSearcher';

type UtimensProps = {
  path: string;
  modificationTime: Date;
  container: Container;
};

/**
 * Applies utimensat(2)'s modification time, for a file that does not exist on
 * the drive yet.
 *
 * That is the case the reported bug is made of. `cp -p` sets the timestamp on
 * the OPEN descriptor, before close, so at that moment the file exists only as
 * a temporal copy with no drive record. Measured with strace:
 *
 *     openat(AT_FDCWD, "dst", O_WRONLY|O_CREAT|O_EXCL, 0600) = 4
 *     utimensat(4, NULL, [...], 0)                           = 0
 *     close(4)                                               = 0
 *
 * A service that only handled uploaded files would therefore answer ENOENT for
 * exactly the case it exists to fix. The requested time is held instead and sent
 * with the file's CREATE call, where `POST /files` takes it as an ordinary part
 * of creating a file.
 *
 * Directories are refused for the same reason and with the same code. They have
 * no staged form and no endpoint that carries a time, and `cp -a` and `tar -x`
 * do set directory times, so answering ENOENT for a directory that plainly
 * exists would send the caller looking for the wrong problem.
 *
 * A file that ALREADY EXISTS on the drive is refused, deliberately. The only
 * endpoint that carries a modification time for one is `PUT /files/{uuid}`,
 * which means re-declaring the current contents id to change a timestamp; on a
 * server whose replace path treats a re-declared id as superseded that deletes
 * the file's own content, and it also mints a billed version. Refusing is what
 * this operation already did before this change, so nothing regresses, and it
 * is honest, which a local-only write would not be: GetAttr answers from the
 * local repository and the next remote listing would silently undo it.
 */
export async function utimens({ path, modificationTime, container }: UtimensProps): Promise<Result<void, FuseError>> {
  try {
    const virtualFile = await container.get(FirstsFileSearcher).run({ path });

    if (virtualFile) {
      logger.debug({ msg: '[FUSE - Utimens] File already exists on the drive, cannot set its time yet', path });
      return { error: new FuseError(FuseCodes.ENOSYS, `[FUSE - Utimens] Not supported for an uploaded file: ${path}`) };
    }

    const temporalFile = await container.get(TemporalFileByPathFinder).run(path);

    if (!temporalFile) {
      const folder = await container.get(SingleFolderMatchingSearcher).run({ path });

      if (folder) {
        logger.debug({ msg: '[FUSE - Utimens] Directories cannot carry a modification time', path });
        return { error: new FuseError(FuseCodes.ENOSYS, `[FUSE - Utimens] Not supported for a directory: ${path}`) };
      }

      const msg = `[FUSE - Utimens] File not found: ${path}`;
      return { error: new FuseError(FuseCodes.ENOENT, msg) };
    }

    // Still staged: nothing exists remotely to update, so hold the time until
    // the upload creates the file and can carry it.
    container.get(PendingModificationTimes).set(path, modificationTime);
    return { data: undefined };
  } catch (error: unknown) {
    logger.error({ msg: '[FUSE - Utimens] Unable to set modification time', error, path });
    return { error: new FuseError(FuseCodes.EIO, `[FUSE - Utimens] IO error: ${path}`) };
  }
}
