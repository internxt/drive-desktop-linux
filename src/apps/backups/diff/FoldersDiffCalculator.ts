import path from 'path';
import { AbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { LocalFolder } from '../../../context/local/localFolder/domain/LocalFolder';
import { LocalTree } from '../../../context/local/localTree/domain/LocalTree';
import { Folder } from '../../../context/virtual-drive/folders/domain/Folder';
import { RemoteTree } from '../../../context/virtual-drive/remoteTree/domain/RemoteTree';
import { relative } from '../utils/relative';

export type FoldersDiff = {
  added: Array<LocalFolder>;
  deleted: Array<Folder>;
  total: number;
};

export class FoldersDiffCalculator {
  static calculate(local: LocalTree, remote: RemoteTree): FoldersDiff {
    const rootPath = local.root.path;

    const added = local.folders.filter((folder) => {
      const remotePath = relative(rootPath, folder.path);

      if (!remotePath) {
        return false;
      }

      return !remote.has(remotePath);
    });

    const deleted = remote.foldersWithOutRoot.filter(
      (folder) => !local.has(path.join(rootPath, folder.path) as AbsolutePath)
    );

    return { added, deleted, total: added.length };
  }
}
