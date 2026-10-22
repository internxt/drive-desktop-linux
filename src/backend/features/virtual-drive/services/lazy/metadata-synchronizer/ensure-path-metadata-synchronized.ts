import { posix } from 'node:path';
import { normalizePath } from '../../normalize-path';
import { resolveFolder } from './resolve-folder';
import { synchronizeChildrenIfStale } from './synchronize-children-if-stale';
import { PathMetadataProps } from './types';

export async function ensurePathMetadataSynchronized({ path, folderRepository, fileRepository }: PathMetadataProps) {
  const normalizedPath = normalizePath(path);
  const parentPath = normalizedPath === '/' ? '/' : posix.dirname(normalizedPath);
  const parentFolder = await resolveFolder({ path: parentPath, folderRepository, fileRepository });
  if (parentFolder.error) return parentFolder;

  return synchronizeChildrenIfStale({ folder: parentFolder.data, folderRepository, fileRepository });
}
