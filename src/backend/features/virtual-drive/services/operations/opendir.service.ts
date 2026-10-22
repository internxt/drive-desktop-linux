import { Container } from 'diod';
import { Result } from '../../../../../context/shared/domain/Result';
import { FILE_MODE, FOLDER_MODE } from '../../constants';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { TemporalFileByFolderFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByFolderFinder';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { readDirectory } from '../lazy/metadata-synchronizer';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';

export type DirEntry = {
  name: string;
  mode: number;
};

export type OpenDirData = {
  entries: DirEntry[];
};

export async function opendir(path: string, container: Container): Promise<Result<OpenDirData, FuseError>> {
  try {
    const [directory, temporalFiles] = await Promise.all([
      readDirectory({
        path,
        folderRepository: container.get(FolderRepository),
        fileRepository: container.get(FileRepository),
      }),
      container.get(TemporalFileByFolderFinder).run(path),
    ]);
    if (directory.error) return { error: directory.error };

    const directoryEntries: DirEntry[] = [
      ...directory.data.files.map((name) => ({ name, mode: FILE_MODE })),
      ...directory.data.folders.map((name) => ({ name, mode: FOLDER_MODE })),
      ...temporalFiles.filter((f) => f.isAuxiliary()).map((f) => ({ name: f.name, mode: FILE_MODE })),
    ];

    return { data: { entries: directoryEntries } };
  } catch (err) {
    if (err instanceof FuseError) return { error: err };
    logger.error({ msg: '[FUSE - OpenDir] Error reading directory', error: err, path });
    return { error: new FuseError(FuseCodes.EIO, `[FUSE - OpenDir] IO error: ${path}`) };
  }
}
