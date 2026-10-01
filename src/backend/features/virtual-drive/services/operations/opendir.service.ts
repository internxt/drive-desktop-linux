import { Container } from 'diod';
import { Result } from '../../../../../context/shared/domain/Result';
import { FILE_MODE, FOLDER_MODE } from '../../constants';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { TemporalFileByFolderFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByFolderFinder';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { LazyVirtualDriveMetadataSynchronizationService } from '../lazy/LazyVirtualDriveMetadataSynchronizationService';

export type DirEntry = {
  name: string;
  mode: number;
};

export type OpenDirData = {
  entries: DirEntry[];
};

export async function opendir(path: string, container: Container): Promise<Result<OpenDirData, FuseError>> {
  try {
    const [entries, temporalFiles] = await Promise.all([
      container.get(LazyVirtualDriveMetadataSynchronizationService).readDirectory({ path }),
      container.get(TemporalFileByFolderFinder).run(path),
    ]);

    const directoryEntries: DirEntry[] = [
      ...entries.files.map((name) => ({ name, mode: FILE_MODE })),
      ...entries.folders.map((name) => ({ name, mode: FOLDER_MODE })),
      ...temporalFiles.filter((f) => f.isAuxiliary()).map((f) => ({ name: f.name, mode: FILE_MODE })),
    ];

    return { data: { entries: directoryEntries } };
  } catch (err) {
    if (err instanceof FuseError) return { error: err };
    logger.error({ msg: '[FUSE - OpenDir] Error reading directory', error: err, path });
    return { error: new FuseError(FuseCodes.EIO, `[FUSE - OpenDir] IO error: ${path}`) };
  }
}
