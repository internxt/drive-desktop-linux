import { LocalFile } from '../../../context/local/localFile/domain/LocalFile';
import { AbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { File } from '../../../context/virtual-drive/files/domain/File';
import { LocalTree } from '../../../context/local/localTree/domain/LocalTree';
import { RemoteTree } from '../../../context/virtual-drive/remoteTree/domain/RemoteTree';
import { relative } from '../utils/relative';
import path from 'path';

export type DiffFiles = {
  added: Array<LocalFile>;
  deleted: Array<File>;
  modified: Map<LocalFile, File>;
};

export class DiffFilesCalculator {
  static async calculate(
    local: LocalTree,
    remote: RemoteTree
  ): Promise<DiffFiles> {
    const added: Array<LocalFile> = [];
    const modified: Map<LocalFile, File> = new Map();

    const rootPath = local.root.path;

    local.files.forEach((local) => {
      const remotePath = relative(rootPath, local.path);

      const remoteExists = remote.has(remotePath);

      if (!remoteExists) {
        added.push(local);
        return;
      }

      const remoteNode = remote.get(remotePath);

      if (remoteNode.isFolder()) {
        return;
      }

      const remoteModificationTime = Math.trunc(
        remoteNode.updatedAt.getTime() / 1000
      );
      const localModificationTime = Math.trunc(local.modificationTime / 1000);

      if (!remoteModificationTime < !localModificationTime) {
        modified.set(local, remoteNode);
      }
    });

    const deleted = remote.files.filter(
      (file) => !local.has(path.join(rootPath, file.path) as AbsolutePath)
    );

    return { added, modified, deleted };
  }
}
