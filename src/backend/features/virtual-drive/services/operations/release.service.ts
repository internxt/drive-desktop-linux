import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type Result } from '../../../../../context/shared/domain/Result';
import { FuseError, FuseIOError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileUploader } from '../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploader';
import { TemporalFileDeleter } from '../../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { FileStatuses } from '../../../../../context/virtual-drive/files/domain/FileStatus';
type Props = {
  path: string;
  processName: string;
  container: Container;
};
export async function release({ path, processName, container }: Props): Promise<Result<void, FuseError>> {
  try {
    const temporalFile = await container.get(TemporalFileByPathFinder).run(path);

    if (!temporalFile) {
      logger.debug({ msg: '[Release] No temporal file found, nothing to upload', path, processName });
      return { data: undefined };
    }

    if (temporalFile.isAuxiliary()) {
      logger.debug({ msg: '[Release] Auxiliary file detected, deleting without upload', path, processName });
      await container.get(TemporalFileDeleter).run(path);
      return { data: undefined };
    }

    const existingFile = await container.get(FirstsFileSearcher).run({ path, status: FileStatuses.EXISTS });
    const replaces = existingFile
      ? { contentsId: existingFile.contentsId, name: existingFile.name, extension: existingFile.type }
      : undefined;

    try {
      await container.get(TemporalFileUploader).run(temporalFile, replaces);
      logger.debug({ msg: '[Release] Temporal file uploaded', path, processName });
      return { data: undefined };
    } catch (uploadError) {
      logger.error({ msg: '[Release] Upload failed, deleting temporal file', error: uploadError, path, processName });
      await container.get(TemporalFileDeleter).run(path);
      return { error: new FuseIOError('Upload failed due to insufficient storage or network issues.') };
    }
  } catch (err: unknown) {
    logger.error({ msg: '[Release] Unexpected error', error: err, path, processName });
    return { error: new FuseIOError('An unexpected error occurred during file release.') };
  }
}
