import { Container } from 'diod';
import { logger, DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';
import { FirstsFileSearcher } from '../../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { TemporalFileByPathFinder } from '../../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { FuseError, FuseNoSuchFileOrDirectoryError } from '../../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { Result } from '../../../../../../context/shared/domain/Result';
import { TemporalFile } from '../../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { uploadLibreOfficeStagingFileOnRename } from './upload-libreoffice-staging-file-on-rename';
import { uploadTemporalFileOnRename } from './upload-temporal-file-on-rename';

type Props = {
  src: string;
  dest: string;
  container: Container;
};

export async function handleTemporalFileUploadOnRename({
  src,
  dest,
  container,
}: Props): Promise<Result<void, FuseError>> {
  const fileToOverride = await container.get(FirstsFileSearcher).run({
    path: dest,
    status: DriveItemStatus.EXISTS,
  });

  const document = await container.get(TemporalFileByPathFinder).run(src);

  if (!fileToOverride) {
    // A new document has no drive file to override. The bytes live in the
    // staging file until this rename, which is the save.
    if (document?.isLibreOfficeStagingFile() && !TemporalFile.isTemporaryPath(dest)) {
      return uploadLibreOfficeStagingFileOnRename({ src, dest, container });
    }

    logger.debug({ msg: '[UPLOAD ON RENAME] file to override not found', dest });
    return { error: new FuseNoSuchFileOrDirectoryError(dest) };
  }

  if (!document) {
    logger.debug({ msg: '[UPLOAD ON RENAME] offline file not found', src });
    return { error: new FuseNoSuchFileOrDirectoryError(src) };
  }

  return uploadTemporalFileOnRename({ virtual: fileToOverride, document, src, container });
}
