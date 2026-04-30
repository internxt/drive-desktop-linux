import { logger } from '@internxt/drive-desktop-core/build/backend';
import { left, right, type Either } from '../../../../context/shared/domain/Either';
import { type TemporalFile } from '../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { FuseError, FuseIOError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';

type Props = {
  path: string;
  findTemporalFile: (path: string) => Promise<TemporalFile | undefined>;
  uploadTemporalFile: (temporalFile: TemporalFile) => Promise<string>;
  deleteTemporalFile: (path: string) => Promise<void>;
};
export async function handleReleaseCallback({
  path,
  findTemporalFile,
  uploadTemporalFile,
  deleteTemporalFile,
}: Props): Promise<Either<FuseError, undefined>> {
  try {
    const temporalFile = await findTemporalFile(path);

    if (!temporalFile) {
      logger.debug({ msg: '[Release] No temporal file found, nothing to upload', path });
      return right(undefined);
    }

    if (temporalFile.isAuxiliary()) {
      logger.debug({ msg: '[Release] Auxiliary file detected, skipping upload', path });
      return right(undefined);
    }

    try {
      await uploadTemporalFile(temporalFile);
      logger.debug({ msg: '[Release] Temporal file uploaded', path });
      return right(undefined);
    } catch (uploadError) {
      logger.error({ msg: '[Release] Upload failed, deleting temporal file', error: uploadError, path });
      await deleteTemporalFile(path);
      return left(new FuseIOError('Upload failed due to insufficient storage or network issues.'));
    }
  } catch (err: unknown) {
    logger.error({ msg: '[Release] Unexpected error', error: err, path });
    return left(new FuseIOError('An unexpected error occurred during file release.'));
  }
}
