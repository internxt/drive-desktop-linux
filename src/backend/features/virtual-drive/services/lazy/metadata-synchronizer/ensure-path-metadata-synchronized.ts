import { posix } from 'node:path';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { isVirtualTrashPath } from '../../drive-folder/seed-virtual-drive-root-folders';
import { normalizePath } from '../../normalize-path';
import { resolveFolder } from './resolve-folder';
import { synchronizeChildrenIfStale } from './synchronize-children-if-stale';
import { PathMetadataProps } from './types';

export async function ensurePathMetadataSynchronized({ path, folderRepository, fileRepository }: PathMetadataProps) {
  const normalizedPath = normalizePath(path);
  if (isVirtualTrashPath(normalizedPath)) return Result.ok(undefined);

  const parentPath = normalizedPath === '/' ? '/' : posix.dirname(normalizedPath);
  const parentFolder = await resolveFolder({ path: parentPath, folderRepository, fileRepository });
  if (parentFolder.error) return parentFolder;

  return synchronizeChildrenIfStale({ folder: parentFolder.data, folderRepository, fileRepository });
}
