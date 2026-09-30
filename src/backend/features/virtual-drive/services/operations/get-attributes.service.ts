import { Container } from 'diod';
import { Result } from '../../../../../context/shared/domain/Result';
import { FILE_MODE, FOLDER_MODE, GetAttributesCallbackData } from '../../constants';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FileStatuses } from '../../../../../context/virtual-drive/files/domain/FileStatus';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { SingleFolderMatchingSearcher } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingSearcher';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { LazyVirtualDriveMetadataSynchronizationService } from '../lazy/LazyVirtualDriveMetadataSynchronizationService';

type AttributesProps = {
  mode: number;
  size: number;
  createdAt: Date;
  modificationTime: Date;
  accessTime?: Date;
  links: number;
};

function getAttributesData({
  mode,
  size,
  createdAt,
  modificationTime,
  accessTime,
  links,
}: AttributesProps): GetAttributesCallbackData {
  return {
    mode,
    size,
    ctime: createdAt,
    mtime: modificationTime,
    atime: accessTime,
    uid: process.getuid?.() || 0,
    gid: process.getgid?.() || 0,
    nlink: links,
  };
}

export async function getAttributes(
  path: string,
  container: Container,
): Promise<Result<GetAttributesCallbackData, FuseError>> {
  if (path === '/' || path === '') {
    return {
      data: getAttributesData({
        mode: FOLDER_MODE,
        size: 0,
        createdAt: new Date(),
        modificationTime: new Date(),
        links: 2,
      }),
    };
  }

  const fileSearcher = container.get(FirstsFileSearcher);
  const folderSearcher = container.get(SingleFolderMatchingSearcher);
  const file = await fileSearcher.run({
    path,
    status: FileStatuses.EXISTS,
  });
  if (file) {
    return {
      data: getAttributesData({
        mode: FILE_MODE,
        size: file.size,
        createdAt: file.createdAt,
        // The contents' modification time, not the row's. These differ once a
        // time has been set through utimensat; before that the getter falls
        // back to updatedAt, which is what this used to read directly.
        modificationTime: file.modificationTime,
        accessTime: new Date(),
        links: 1,
      }),
    };
  }
  const folder = await folderSearcher.run({
    path,
  });
  if (folder) {
    return {
      data: getAttributesData({
        mode: FOLDER_MODE,
        size: 0,
        createdAt: folder.createdAt,
        modificationTime: folder.updatedAt,
        accessTime: folder.createdAt,
        links: 2,
      }),
    };
  }
  const document = await container.get(TemporalFileByPathFinder).run(path);

  if (document) {
    return {
      data: getAttributesData({
        mode: FILE_MODE,
        size: document.size.value,
        createdAt: document.createdAt,
        modificationTime: new Date(),
        accessTime: document.createdAt,
        links: 1,
      }),
    };
  }

  try {
    await container.get(LazyVirtualDriveMetadataSynchronizationService).ensurePathMetadataSynchronized({ path });
  } catch (error) {
    if (error instanceof FuseError) {
      return { error };
    }

    return { error: new FuseError(FuseCodes.EIO, `[FUSE - GetAttributes] IO error: ${path}`) };
  }

  const hydratedFile = await fileSearcher.run({ path, status: FileStatuses.EXISTS });
  if (hydratedFile) {
    return {
      data: getAttributesData({
        mode: FILE_MODE,
        size: hydratedFile.size,
        createdAt: hydratedFile.createdAt,
        modificationTime: hydratedFile.modificationTime,
        accessTime: new Date(),
        links: 1,
      }),
    };
  }

  const hydratedFolder = await folderSearcher.run({ path });
  if (hydratedFolder) {
    return {
      data: getAttributesData({
        mode: FOLDER_MODE,
        size: 0,
        createdAt: hydratedFolder.createdAt,
        modificationTime: hydratedFolder.updatedAt,
        accessTime: hydratedFolder.createdAt,
        links: 2,
      }),
    };
  }

  const msg = `[FUSE - GetAttributes] File not found: ${path}`;
  return { error: new FuseError(FuseCodes.ENOENT, msg) };
}
