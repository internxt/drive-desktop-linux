import { Service } from 'diod';
import { CurrentRemoteFilesProvider } from '../../remoteFile/application/CurrentRemoteFilesProvider';
import { LocalFile } from '../../localFile/domain/LocalFile';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';
import CurrentLocalFilesProvider from '../../localFile/application/CurrentLocalFilesProvider';
import { RemoteFile } from '../../remoteFile/domain/RemoteFile';

export type DiffFiles = {
  added: Array<LocalFile>;
  deleted: Array<RemoteFile>;
  modified: Array<[RemoteFile, LocalFile]>;
};

@Service()
export class DiffFilesCalculator {
  constructor(
    private readonly localFilesProvider: CurrentLocalFilesProvider,
    private readonly remoteFileProvider: CurrentRemoteFilesProvider
  ) {}

  async run(folder: AbsolutePath): Promise<DiffFiles> {
    const added: Array<LocalFile> = [];
    const deleted: Array<RemoteFile> = [];
    const modified: Array<[RemoteFile, LocalFile]> = [];

    const localFiles = await this.localFilesProvider.run(folder);

    const remoteFiles = await this.remoteFileProvider.run(folder);

    localFiles.forEach((local, path) => {
      const remote = remoteFiles.get(path);

      if (!remote) {
        added.push(local);
        return;
      }

      if (remote.modificationTime !== local.modificationTime) {
        modified.push([remote, local]);
      }
    });

    remoteFiles.forEach((remote, path) => {
      if (localFiles.has(path)) {
        return;
      }

      deleted.push(remote);
    });

    return { added, modified, deleted: deleted };
  }
}
