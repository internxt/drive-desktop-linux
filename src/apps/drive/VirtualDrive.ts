import { Container } from 'diod';
import { StorageFileIsAvailableOffline } from '../../context/storage/StorageFiles/application/find/StorageFileIsAvailableOffline';
import { FirstsFileSearcher } from '../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { FileDownloader } from '../../context/virtual-drive/files/application/download/FileDownloader';
import { StorageFileWriter } from '../../context/storage/StorageFiles/application/write/StorageFileWriter';
import { Either, left, right } from '../../context/shared/domain/Either';
import {
  FileNotFoundVirtualDriveError,
  VirtualDriveError,
} from './errors/VirtualDriveError';
import { StorageFileDeleter } from '../../context/storage/StorageFiles/application/delete/StorageFileDeleter';
import { TemporalFileByPathFinder } from '../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';

export class VirtualDrive {
  constructor(private readonly container: Container) {}

  async isLocallyAvailable(
    path: string
  ): Promise<Either<VirtualDriveError, boolean>> {
    const virtualFile = await this.container.get(FirstsFileSearcher).run({
      path,
    });

    if (!virtualFile) {
      return left(new FileNotFoundVirtualDriveError(path));
    }

    const isAvailable = await this.container
      .get(StorageFileIsAvailableOffline)
      .run(virtualFile.contentsId);

    return right(isAvailable);
  }

  async makeFileLocallyAvailable(
    path: string
  ): Promise<Either<VirtualDriveError, void>> {
    const virtualFile = await this.container
      .get(FirstsFileSearcher)
      .run({ path });

    if (!virtualFile) {
      return left(new FileNotFoundVirtualDriveError(path));
    }

    const stream = await this.container.get(FileDownloader).run(virtualFile);
    await this.container
      .get(StorageFileWriter)
      .run(virtualFile.contentsId, stream);

    return right(undefined);
  }

  async makeFileRemoteOnly(
    path: string
  ): Promise<Either<VirtualDriveError, void>> {
    const file = await this.container.get(FirstsFileSearcher).run({
      path,
    });

    if (!file) {
      return left(new FileNotFoundVirtualDriveError(path));
    }

    await this.container.get(StorageFileDeleter).run(file.contentsId);

    return right(undefined);
  }

  async temporalFileExists(
    path: string
  ): Promise<Either<VirtualDriveError, boolean>> {
    const file = await this.container.get(TemporalFileByPathFinder).run(path);

    if (!file) {
      return right(false);
    }

    return right(true);
  }
}
