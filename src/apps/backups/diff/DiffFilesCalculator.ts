import { LocalFile } from '../../../context/local/localFile/domain/LocalFile';
import { AbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { File } from '../../../context/virtual-drive/files/domain/File';
import path from 'path';
import { LocalTree } from '../../../context/local/localTree/domain/LocalTree';
import { RemoteTree } from '../../../context/virtual-drive/remoteTree/domain/Tree';

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
      const remotePath = path.posix.relative(rootPath, local.path);

      const remoteExists = remote.has(remotePath);

      if (!remoteExists) {
        added.push(local);
        return;
      }

      const remoteNode = remote.get(remotePath);

      if (remoteNode.isFolder()) {
        return;
      }

      if (remoteNode.updatedAt.getTime() !== local.modificationTime) {
        modified.set(local, remoteNode);
      }
    });

    const deleted = remote.files.filter(
      (file) => !local.has(file.path as AbsolutePath)
    );

    return { added, modified, deleted };
  }
}
