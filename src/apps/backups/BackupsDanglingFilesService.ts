import { Service } from 'diod';
import { StorageFileDownloader } from '../../context/storage/StorageFiles/application/download/StorageFileDownloader/StorageFileDownloader';
import { LocalFile } from '../../context/local/localFile/domain/LocalFile';
import { File } from '../../context/virtual-drive/files/domain/File';
import Logger from 'electron-log';

@Service()
export class BackupsDanglingFilesService {
  constructor(private readonly storageFileDownloader: StorageFileDownloader) {}

  async handleDanglingFilesOnBackup(
    danglingFiles: Map<LocalFile, File>
  ): Promise<Map<LocalFile, File>> {
    const filesToResync = new Map<LocalFile, File>();

    for (const [localFile, remoteFile] of danglingFiles) {
      try {
        const resultEither =
          await this.storageFileDownloader.isFileDownloadable(
            remoteFile.contentsId
          );
        if (resultEither.isRight()) {
          const isFileDownloadable = resultEither.getRight();
          if (!isFileDownloadable) {
            Logger.warn(
              `[BACKUP DANGLING FILE] File ${remoteFile.contentsId} is not downloadable, backing up again...`
            );
            filesToResync.set(localFile, remoteFile);

          }
        } else {
          const error = resultEither.getLeft();
          Logger.error(
            `[BACKUP DANGLING FILE] Error checking file ${remoteFile.contentsId}: ${error.message}`
          );
        }
      } catch (error) {
        Logger.error(
          `[BACKUP DANGLING FILE] Error while handling dangling file ${remoteFile.contentsId}: ${error}`
        );
      }
    }
    return filesToResync;
  }
}
