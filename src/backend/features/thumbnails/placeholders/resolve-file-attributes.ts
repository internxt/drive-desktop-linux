import { FILE_MODE } from '../../virtual-drive/constants';
import type { File } from '../../../../context/virtual-drive/files/domain/File';
import { getMediaCategory, requiresThumbnail } from './thumbnail-mime';
import { getPlaceholderBufferByCategory } from './placeholder-buffers';
import { shouldServePlaceholder } from './should-serve-placeholder';

type ResolveFileAttributesProps = {
  readonly file: File;
  readonly isCachedLocally: boolean;
  readonly processName?: string;
};

export function resolveFileAttributes({ file, isCachedLocally, processName = '' }: ResolveFileAttributesProps) {
  const fileName = file.nameWithExtension ?? file.name ?? '';
  const needsThumbnail = fileName ? requiresThumbnail({ fileName }) : false;

  if (shouldServePlaceholder({ processName, isCachedLocally, needsThumbnail })) {
    const category = getMediaCategory({ fileName });
    const placeholder = getPlaceholderBufferByCategory({ category });

    return {
      mode: FILE_MODE,
      size: placeholder.length,
      ctime: file.createdAt,
      mtime: file.modificationTime,
      atime: new Date(),
      uid: process.getuid?.() || 0,
      gid: process.getgid?.() || 0,
      nlink: 1,
    };
  }

  return {
    mode: FILE_MODE,
    size: file.size,
    ctime: file.createdAt,
    mtime: file.modificationTime,
    atime: new Date(),
    uid: process.getuid?.() || 0,
    gid: process.getgid?.() || 0,
    nlink: 1,
  };
}
