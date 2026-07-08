import type { Identifier } from 'diod';
import type {
  LazyVirtualDriveHydratorProps,
  ReadDirectoryProps,
  EnsurePathLoadedProps,
  HydratorStatusScope,
} from './types';
import { normalizePath, isRootPath } from './path';
import { ensureFolderMaterialized } from './ensure-folder-materialized';
import { refreshChildrenIfNeeded } from './refresh-children-if-needed';
import { fetchAndStoreChildren } from './fetch-and-store-children';
import { readLocalDirectory } from './children';

export const LazyVirtualDriveHydrator = Symbol(
  'LazyVirtualDriveHydrator',
) as unknown as Identifier<ReturnType<typeof createLazyVirtualDriveHydratorService>>;

export type LazyVirtualDriveHydrator = ReturnType<typeof createLazyVirtualDriveHydratorService>;

type FetchAndStoreChildrenProps = Parameters<typeof fetchAndStoreChildren>[0];
type FetchAndStoreChildrenInput = Pick<FetchAndStoreChildrenProps, 'folder' | 'statusScope'>;

export function createLazyVirtualDriveHydratorService({
  folderRepository,
  fileRepository,
  directoryStateRepository,
}: LazyVirtualDriveHydratorProps) {
  const inflight = new Map<string, Promise<void>>();

  function getFetchAndStoreChildren() {
    return ({ folder, statusScope }: FetchAndStoreChildrenInput) =>
      fetchAndStoreChildren({
        folder,
        statusScope,
        folderRepository,
        fileRepository,
        directoryStateRepository,
      });
  }

  async function readDirectory({ path: requestedPath }: ReadDirectoryProps) {
    const normalizedPath = normalizePath(requestedPath);
    const statusScope: HydratorStatusScope = 'EXISTS';

    const folder = await ensureFolderMaterialized({
      requestedPath: normalizedPath,
      statusScope,
      folderRepository,
      refreshChildrenIfNeeded: (props) =>
        refreshChildrenIfNeeded({
          ...props,
          directoryStateRepository,
          inflight,
          fetchAndStoreChildren: getFetchAndStoreChildren(),
        }),
    });

    await refreshChildrenIfNeeded({
      folder,
      statusScope,
      directoryStateRepository,
      inflight,
      fetchAndStoreChildren: getFetchAndStoreChildren(),
    });

    return readLocalDirectory({ folder, folderRepository, fileRepository });
  }

  async function ensurePathLoaded({ path: requestedPath }: EnsurePathLoadedProps) {
    const normalizedPath = normalizePath(requestedPath);
    const statusScope: HydratorStatusScope = 'EXISTS';
    const parentPath = isRootPath(normalizedPath)
      ? normalizedPath
      : normalizedPath.slice(0, normalizedPath.lastIndexOf('/')) || '/';

    await ensureFolderMaterialized({
      requestedPath: parentPath,
      statusScope,
      folderRepository,
      refreshChildrenIfNeeded: (props) =>
        refreshChildrenIfNeeded({
          ...props,
          directoryStateRepository,
          inflight,
          fetchAndStoreChildren: getFetchAndStoreChildren(),
        }),
    });
  }

  return {
    readDirectory,
    ensurePathLoaded,
  };
}
