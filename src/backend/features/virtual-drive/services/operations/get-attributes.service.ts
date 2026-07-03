import { Container } from 'diod';
import { Result } from '../../../../../context/shared/domain/Result';
import { FILE_MODE, FOLDER_MODE, GetAttributesCallbackData } from '../../constants';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FileStatuses } from '../../../../../context/virtual-drive/files/domain/FileStatus';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { SingleFolderMatchingSearcher } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingSearcher';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { LazyVirtualDriveHydrator } from '../lazy/LazyVirtualDriveHydrator';

async function findLocalEntry(path: string, container: Container) {
  const file = await container.get(FirstsFileSearcher).run({
    path,
    status: FileStatuses.EXISTS,
  });

  if (file) {
    return { file };
  }

  const folder = await container.get(SingleFolderMatchingSearcher).run({
    path,
  });

  if (folder) {
    return { folder };
  }

  return {};
}

export async function getAttributes(
  path: string,
  container: Container,
): Promise<Result<GetAttributesCallbackData, FuseError>> {
  if (path === '/' || path === '') {
    return {
      data: {
        mode: FOLDER_MODE,
        size: 0,
        mtime: new Date(),
        ctime: new Date(),
        atime: undefined,
        uid: process.getuid?.() || 0,
        gid: process.getgid?.() || 0,
        nlink: 2,
      },
    };
  }

  const localEntry = await findLocalEntry(path, container);
  const file = localEntry.file;
  if (file) {
    return {
      data: {
        mode: FILE_MODE,
        size: file.size,
        ctime: file.createdAt,
        mtime: file.updatedAt,
        atime: new Date(),
        uid: process.getuid?.() || 0,
        gid: process.getgid?.() || 0,
        nlink: 1,
      },
    };
  }
  const folder = localEntry.folder;
  if (folder) {
    return {
      data: {
        mode: FOLDER_MODE,
        size: 0,
        ctime: folder.createdAt,
        mtime: folder.updatedAt,
        atime: folder.createdAt,
        uid: process.getuid?.() || 0,
        gid: process.getgid?.() || 0,
        nlink: 2,
      },
    };
  }
  const document = await container.get(TemporalFileByPathFinder).run(path);

  if (document) {

  await container.get(LazyVirtualDriveHydrator).ensurePathLoaded({ path });

  const hydratedEntry = await findLocalEntry(path, container);
  if (hydratedEntry.file) {
    return {
      data: {
        mode: FILE_MODE,
        size: hydratedEntry.file.size,
        ctime: hydratedEntry.file.createdAt,
        mtime: hydratedEntry.file.updatedAt,
        atime: new Date(),
        uid: process.getuid?.() || 0,
        gid: process.getgid?.() || 0,
        nlink: 1,
      },
    };
  }

  if (hydratedEntry.folder) {
    return {
      data: {
        mode: FOLDER_MODE,
        size: 0,
        ctime: hydratedEntry.folder.createdAt,
        mtime: hydratedEntry.folder.updatedAt,
        atime: hydratedEntry.folder.createdAt,
        uid: process.getuid?.() || 0,
        gid: process.getgid?.() || 0,
        nlink: 2,
      },
    };
  }

    return {
      data: {
        mode: FILE_MODE,
        size: document.size.value,
        mtime: new Date(),
        ctime: document.createdAt,
        atime: document.createdAt,
        uid: process.getuid?.() || 0,
        gid: process.getgid?.() || 0,
        nlink: 1,
      },
    };
  }
  const msg = `[FUSE - GetAttributes] File not found: ${path}`;
  return { error: new FuseError(FuseCodes.ENOENT, msg) };
}
