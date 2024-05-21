import { Container } from 'diod';
import Logger from 'electron-log';
import { AbsolutePath } from '../../context/backups/localFile/infrastructure/AbsolutePath';
import { DiffFilesCalculator } from '../../context/backups/shared/application/DiffFilesCalculator';
import { BackupInfo } from './BackupInfo';
import { FileUploaderByChunks } from '../../context/backups/remoteFile/application/upload/FileUploaderByChunks';
import { RemoteFile } from '../../context/backups/remoteFile/domain/RemoteFile';

export class Backup {
  private abortController = new AbortController();

  private readonly diffFilesCalculator: DiffFilesCalculator;
  private readonly fileUploaderByChunks: FileUploaderByChunks;

  constructor(container: Container) {
    this.diffFilesCalculator = container.get(DiffFilesCalculator);
    this.fileUploaderByChunks = container.get(FileUploaderByChunks);

    this.listenForConnectionLost();
  }

  private listenForConnectionLost() {
    window.addEventListener('offline', () => {
      Logger.log('[BACKUPS] Internet connection lost');
      this.abortController.abort('CONNECTION_LOST');
    });
  }

  async backup(info: BackupInfo): Promise<void> {
    const { added, modified, deleted } = await this.diffFilesCalculator.run(
      info.path as AbsolutePath
    );

    const remoteFileToAdd = added.map((local) =>
      RemoteFile.from(local.attributes())
    );

    await this.fileUploaderByChunks.run(
      remoteFileToAdd,
      this.abortController.signal
    );
  }
}
