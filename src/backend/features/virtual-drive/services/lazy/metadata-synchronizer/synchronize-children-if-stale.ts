import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { isVirtualTrashFolder } from '../../drive-folder/seed-virtual-drive-root-folders';
import { refreshChildren } from './refresh-children';
import { FolderMetadataProps } from './types';

const inFlightRefreshes = new Map<string, ReturnType<typeof refreshChildren>>();

export async function synchronizeChildrenIfStale(props: FolderMetadataProps) {
  // /.Trash and /.Trash-$uid are local folders. Their uuids are not on the server.
  if (isVirtualTrashFolder(props.folder)) return Result.ok(undefined);

  const key = `${props.folder.id}:EXISTS`;
  const inFlightRefresh = inFlightRefreshes.get(key);

  if (inFlightRefresh) return inFlightRefresh;

  const refresh = refreshChildren(props).finally(() => {
    inFlightRefreshes.delete(key);
  });
  inFlightRefreshes.set(key, refresh);

  return refresh;
}
