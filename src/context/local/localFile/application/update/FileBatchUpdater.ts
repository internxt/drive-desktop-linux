import { Service } from 'diod';
import { LocalFile } from '../../domain/LocalFile';
import { LocalFileUploader } from '../../domain/LocalFileUploader';
import { RemoteTree } from '../../../../virtual-drive/remoteTree/domain/RemoteTree';
import { SimpleFileOverrider } from '../../../../virtual-drive/files/application/override/SimpleFileOverrider';
import path from 'path';
import { LocalFolder } from '../../../localFolder/domain/LocalFolder';

@Service()
export class FileBatchUpdater {
  constructor(
    private readonly uploader: LocalFileUploader,
    private readonly simpleFileOverrider: SimpleFileOverrider
  ) {}

  async run(
    localRoot: LocalFolder,
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

      const remotePath = path.posix.relative(localRoot.path, localFile.path);

      const file = remoteTree.get(remotePath);

      if (file.isFolder()) {
        throw new Error(`Expected file, found folder on ${file.path}`);
      }

      // eslint-disable-next-line no-await-in-loop
      await this.simpleFileOverrider.run(file, contentsId, localFile.size);
    }
  }
}
