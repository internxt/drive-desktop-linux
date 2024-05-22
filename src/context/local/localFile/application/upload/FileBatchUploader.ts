import { Service } from 'diod';
import { LocalFile } from '../../domain/LocalFile';
import { LocalFileUploader } from '../../domain/LocalFileUploader';
import { SimpleFileCreator } from '../../../../virtual-drive/files/application/create/SimpleFileCreator';
import { RemoteTree } from '../../../../virtual-drive/remoteTree/domain/Tree';

@Service()
export class FileBatchUploader {
  constructor(
    private readonly uploader: LocalFileUploader,
    private readonly creator: SimpleFileCreator
  ) {}

  async run(
    remoteTree: RemoteTree,
    batch: Array<LocalFile>,
    signal: AbortSignal
  ): Promise<void> {
    for (const localFile of batch) {
      // eslint-disable-next-line no-await-in-loop
      const contentsId = await this.uploader.upload(
        localFile.path,
        localFile.size,
        signal
      );

      const parent = remoteTree.getParent(localFile.path);

      // eslint-disable-next-line no-await-in-loop
      const file = await this.creator.run(
        contentsId,
        localFile.path,
        localFile.size,
        parent.id
      );

      remoteTree.addFile(parent, file);
    }
  }
}
