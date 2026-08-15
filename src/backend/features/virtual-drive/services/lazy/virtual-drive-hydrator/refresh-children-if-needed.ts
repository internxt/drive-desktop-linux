import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { DirectoryStateSqliteRepository } from '../DirectoryStateSqliteRepository';
import type { HydratorStatusScope } from './types';

export async function refreshChildrenIfNeeded({
  folder,
  statusScope,
  directoryStateRepository,
  inflight,
  fetchAndStoreChildren,
}: {
  folder: Folder;
  statusScope: HydratorStatusScope;
  directoryStateRepository: DirectoryStateSqliteRepository;
  inflight: Map<string, Promise<void>>;
  fetchAndStoreChildren: (props: { folder: Folder; statusScope: HydratorStatusScope }) => Promise<void>;
}) {
  const cacheKey = `${folder.id}:${statusScope}`;

  if (await directoryStateRepository.isFresh({ folderId: folder.id, statusScope })) {
    return;
  }

  const inFlight = inflight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const task = fetchAndStoreChildren({ folder, statusScope }).finally(() => {
    inflight.delete(cacheKey);
  });

  inflight.set(cacheKey, task);

  return task;
}
