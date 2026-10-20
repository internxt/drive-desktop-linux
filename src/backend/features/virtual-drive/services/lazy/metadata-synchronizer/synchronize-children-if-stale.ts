import { refreshChildren } from './refresh-children';
import { FolderMetadataProps } from './types';

const inFlightRefreshes = new Map<string, ReturnType<typeof refreshChildren>>();

export async function synchronizeChildrenIfStale(props: FolderMetadataProps) {
  const key = `${props.folder.id}:EXISTS`;
  const inFlightRefresh = inFlightRefreshes.get(key);

  if (inFlightRefresh) return inFlightRefresh;

  const refresh = refreshChildren(props).finally(() => {
    inFlightRefreshes.delete(key);
  });
  inFlightRefreshes.set(key, refresh);

  return refresh;
}
