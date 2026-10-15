import { Container } from 'diod';
import { join } from 'node:path';
import { Result } from '../../../../../context/shared/domain/Result';
import { FILE_MODE, FOLDER_MODE, GetAttributesCallbackData } from '../../constants';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FileStatuses } from '../../../../../context/virtual-drive/files/domain/FileStatus';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { SingleFolderMatchingSearcher } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingSearcher';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { ensurePathMetadataSynchronized } from '../lazy/metadata-synchronizer';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import type { File } from '../../../../../context/virtual-drive/files/domain/File';
import { PATHS } from '../../../../../core/electron/paths';
import { fileExistsOnDisk } from '../../../fuse/on-read/download-cache/file-exists-on-disk';
import { resolveFileAttributes } from '../../../thumbnails/placeholders/resolve-file-attributes';
import { isThumbnailProcess } from '../../../fuse/on-read/thumbnail-processes';
import { requiresThumbnail } from '../../../thumbnails/placeholders/thumbnail-mime';

type AttributesProps = {
  mode: number;
  size: number;
  createdAt: Date;
  modificationTime: Date;
  accessTime?: Date;
  links: number;
};

type FileAttributesProps = {
  file: File;
  processName?: string;
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

/**
 * Thumbnail processes must see the placeholder size until the bytes are on disk.
 * Every other caller keeps the real size. mtime is the contents' modification
 * time, not the row's updatedAt.
 */
async function fileAttributes({ file, processName }: FileAttributesProps) {
  const fileName = file.nameWithExtension ?? file.name ?? '';
  const needsThumbnail = requiresThumbnail({ fileName });
  const isThumbnailInspection = needsThumbnail && isThumbnailProcess(processName ?? '');
  const filePath = isThumbnailInspection && file.contentsId ? join(PATHS.DOWNLOADED, file.contentsId) : '';
  const isCachedLocally = isThumbnailInspection ? (filePath ? await fileExistsOnDisk(filePath) : false) : true;

  return resolveFileAttributes({
    file,
    isCachedLocally,
    processName,
  });
}

export async function getAttributes(
  path: string,
  container: Container,
  processName?: string,
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
    return { data: await fileAttributes({ file, processName }) };
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
    const synchronized = await ensurePathMetadataSynchronized({
      path,
      folderRepository: container.get(FolderRepository),
      fileRepository: container.get(FileRepository),
    });
    if (synchronized.error) return { error: synchronized.error };
  } catch (error) {
    if (error instanceof FuseError) {
      return { error };
    }

    return { error: new FuseError(FuseCodes.EIO, `[FUSE - GetAttributes] IO error: ${path}`) };
  }

  const hydratedFile = await fileSearcher.run({ path, status: FileStatuses.EXISTS });
  if (hydratedFile) {
    return { data: await fileAttributes({ file: hydratedFile, processName }) };
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
