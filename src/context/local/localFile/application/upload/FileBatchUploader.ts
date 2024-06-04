import { Service } from 'diod';
import { LocalFile } from '../../domain/LocalFile';
import { LocalFileHandler } from '../../domain/LocalFileUploader';
import { SimpleFileCreator } from '../../../../virtual-drive/files/application/create/SimpleFileCreator';
import { RemoteTree } from '../../../../virtual-drive/remoteTree/domain/RemoteTree';
import { relative } from '../../../../../apps/backups/utils/relative';
import Logger from 'electron-log';

@Service()
export class FileBatchUploader {
  constructor(
    private readonly localHandler: LocalFileHandler,
    private readonly creator: SimpleFileCreator
  ) {}

  async run(
    localRootPath: string,
    remoteTree: RemoteTree,
    batch: Array<LocalFile>,
    signal: AbortSignal
  ): Promise<void> {
    for (const localFile of batch) {
      // eslint-disable-next-line no-await-in-loop
      const contentsId = await this.localHandler.upload(
        localFile.path,
        localFile.size,
        signal
      );

      const remotePath = relative(localRootPath, localFile.path);

      const parent = remoteTree.getParent(remotePath);

      // eslint-disable-next-line no-await-in-loop
      const either = await this.creator.run(
        contentsId,
        localFile.path,
        localFile.size,
        parent.id
      );

      if (either.isLeft()) {
        // eslint-disable-next-line no-await-in-loop
        await this.localHandler.delete(contentsId);
        const error = either.getLeft();

        if (error.cause === 'FILE_ALREADY_EXISTS') {
          continue;
        }

        throw error;
      }

      const file = either.getRight();

      remoteTree.addFile(parent, file);
    }
  }
}
