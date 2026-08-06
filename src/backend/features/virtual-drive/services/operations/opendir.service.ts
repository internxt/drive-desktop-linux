import { Container } from 'diod';
import { Result } from '../../../../../context/shared/domain/Result';
import { FILE_MODE, FOLDER_MODE } from '../../constants';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { TemporalFileByFolderFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByFolderFinder';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { LazyVirtualDriveHydrator } from '../lazy/virtual-drive-hydrator/create-lazy-virtual-drive-hydrator-service';

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
      container.get(LazyVirtualDriveHydrator).readDirectory({ path }),
      container.get(TemporalFileByFolderFinder).run(path),
    ]);

    const data: DirEntry[] = [
      ...entries.folders.map((name) => ({ name, mode: FOLDER_MODE })),
      ...entries.files.map((name) => ({ name, mode: FILE_MODE })),
      ...temporalFiles.filter((f) => f.isAuxiliary()).map((f) => ({ name: f.name, mode: FILE_MODE })),
    ];

    return { data: { entries: data } };
  } catch (err) {
    logger.error({ msg: '[FUSE - OpenDir] Error reading directory', error: err, path });
    return { error: err as FuseError };
  }
}
