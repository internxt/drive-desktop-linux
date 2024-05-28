import { LocalFolder } from '../../../context/local/localFolder/domain/LocalFolder';
import { LocalTree } from '../../../context/local/localTree/domain/LocalTree';
import { Folder } from '../../../context/virtual-drive/folders/domain/Folder';
import { RemoteTree } from '../../../context/virtual-drive/remoteTree/domain/RemoteTree';
import { relative } from '../utils/relative';

export type FolderDiff = {
  added: Array<LocalFolder>;
  deleted: Array<Folder>;
};

export class FoldersDiffCalculator {
  static calculate(local: LocalTree, remote: RemoteTree): FolderDiff {
    const rootPath = local.root.path;

    const added = local.folders.filter((folder) => {
      const remotePath = relative(rootPath, folder.path);

      if (!remotePath) {
        return false;
      }

      return !remote.has(remotePath);
    });

    return { added, deleted: [] };
  }
}
