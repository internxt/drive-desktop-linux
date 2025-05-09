import { Container } from 'diod';
import { extname } from 'path';
import { Either, right } from '../../../context/shared/domain/Either';
import { AllFilesInFolderAreAvailableOffline } from '../../../context/storage/StorageFolders/application/offline/AllFilesInFolderAreAvailableOffline';
import { StorageFileIsAvailableOffline } from '../../../context/storage/StorageFiles/application/offline/StorageFileIsAvailableOffline';
import { TemporalFileByPathFinder } from '../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { VirtualDriveError } from '../errors/VirtualDriveError';
import Logger from 'electron-log';
import { CacheStorageFile } from '../../../context/storage/StorageFiles/application/offline/CacheStorageFile';

export class VirtualDrive {
  constructor(private readonly container: Container) {}

  private async isFileLocallyAvailable(path: string): Promise<boolean> {
    try {
      return await this.container.get(StorageFileIsAvailableOffline).run(path);
    } catch (error) {
      Logger.debug((error as Error).message);
      // If the path is from a folder it will not find it as a file
      return false;
    }
  }

  private async isFolderLocallyAvailable(path: string): Promise<boolean> {
    try {
      return await this.container
        .get(AllFilesInFolderAreAvailableOffline)
        .run(path);
    } catch (error) {
      Logger.debug((error as Error).message);
      // If the path is from a file it will not find it as a folder
      return false;
    }
  }

  private seemsToBeFromAFile(path: string): boolean {
    return extname(path) !== '';
  }

  async isLocallyAvailable(path: string): Promise<boolean> {
    if (this.seemsToBeFromAFile(path)) {
      const fileIsAvaliable = await this.isFileLocallyAvailable(path);

      if (fileIsAvaliable) return true;

      return this.isFolderLocallyAvailable(path);
    }

    const allFilesInFolderAreAvaliable = await this.isFolderLocallyAvailable(
      path
    );
    if (allFilesInFolderAreAvaliable) return true;

    return await this.isFileLocallyAvailable(path);
  }

  async makeFileLocallyAvailable(path: string): Promise<void> {
    await this.container.get(CacheStorageFile).run(path);
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
