import Logger from 'electron-log';
import { FileCreationOrchestrator } from '../../../../context/virtual-drive/boundaryBridge/application/FileCreationOrchestrator';
import { createFilePlaceholderId } from '../../../../context/virtual-drive/files/domain/PlaceholderId';
import { FolderCreator } from '../../../../context/virtual-drive/folders/application/FolderCreator';
import { OfflineFolderCreator } from '../../../../context/virtual-drive/folders/application/Offline/OfflineFolderCreator';
import { createFolderPlaceholderId } from '../../../../context/virtual-drive/folders/domain/FolderPlaceholderId';
import { OfflineFolder } from '../../../../context/virtual-drive/folders/domain/OfflineFolder';
import { AbsolutePathToRelativeConverter } from '../../../../context/virtual-drive/shared/application/AbsolutePathToRelativeConverter';
import { PlatformPathConverter } from '../../../../context/virtual-drive/shared/application/PlatformPathConverter';
import { PathTypeChecker } from '../../../shared/fs/PathTypeChecker ';
import { CallbackController } from './CallbackController';
import { FolderNotFoundError } from '../../../../context/virtual-drive/folders/domain/errors/FolderNotFoundError';

type CreationCallback = (acknowledge: boolean, id: string) => void;

export class AddController extends CallbackController {
  // Gets called when:
  //  - a file has been added
  //  -a file has been saved
  //  - after a file has been moved to a folder

  constructor(
    private readonly absolutePathToRelativeConverter: AbsolutePathToRelativeConverter,
    private readonly fileCreationOrchestrator: FileCreationOrchestrator,
    private readonly folderCreator: FolderCreator,
    private readonly offlineFolderCreator: OfflineFolderCreator
  ) {
    super();
  }

  private createFile = async (
    posixRelativePath: string,
    callback: (acknowledge: boolean, id: string) => void,
    attempts = 3
  ) => {
    try {
      const contentsId = await this.fileCreationOrchestrator.run(
        posixRelativePath
      );
      // Logger.debug(
      //   'File created callback emited by',
      //   posixRelativePath,
      //   'contentsId',
      //   contentsId
      // );
      callback(true, createFilePlaceholderId(contentsId));
    } catch (error: unknown) {
      Logger.error('Error when adding a file: ' + posixRelativePath, error);
      if (error instanceof FolderNotFoundError) {
        await this.createFolderFather(posixRelativePath);
      }
      if (attempts > 0) {
        Logger.info('[Creating file]', 'retrying...', attempts);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await this.createFile(posixRelativePath, callback, attempts - 1);
        // attempts--;
        return;
      }
      Logger.error('[Creating file]', 'Max retries reached', 'callback emited');
      callback(false, '');
    }
  };

  private createFolder = async (
    offlineFolder: OfflineFolder,
    callback: (acknowledge: boolean, id: string) => void,
    attempts = 3
  ) => {
    try {
      await this.folderCreator.run(offlineFolder);
      callback(true, createFolderPlaceholderId(offlineFolder.uuid));
    } catch (error: unknown) {
      Logger.error('Error creating folder', error);
      if (attempts > 0) {
        Logger.info('[Creating folder]', 'retrying...', attempts);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await this.createFolder(offlineFolder, callback, attempts - 1);
        return;
      }
      Logger.error(
        '[Creating folder]',
        'Max retries reached',
        'callback emited'
      );
      callback(false, '');
    }
  };

  private async createFolderFather(posixRelativePath: string) {
    const posixDir =
      PlatformPathConverter.getFatherPathPosix(posixRelativePath);
    try {
      const offlineFolder = this.offlineFolderCreator.run(posixDir);
      const newFolder = await this.folderCreator.run(offlineFolder);
      // TODO: we need to add from node-win a function to convert folders to placeholders manually here
      Logger.debug('Folder created from father creation:', newFolder);
    } catch (e) {
      Logger.error('Error creating folder father creation:', e);
      if (e instanceof FolderNotFoundError) {
        await this.createFolderFather(posixDir);
      }
      const offlineFolder = this.offlineFolderCreator.run(posixDir);
      const newFolder = await this.folderCreator.run(offlineFolder);
      // TODO: we need to add from node-win a function to convert folders to placeholders manually here
      Logger.debug('Folder created from father creation:', newFolder);
    }
  }

  private async createOfflineFolder(
    posixRelativePath: string
  ): Promise<OfflineFolder> {
    try {
      return this.offlineFolderCreator.run(posixRelativePath);
    } catch (error) {
      if (error instanceof FolderNotFoundError) {
        await this.createFolderFather(posixRelativePath);
      }
      return this.createOfflineFolder(posixRelativePath);
    }
  }

  async execute(
    absolutePath: string,
    callback: CreationCallback
  ): Promise<void> {
    const win32RelativePath =
      this.absolutePathToRelativeConverter.run(absolutePath);

    const posixRelativePath =
      PlatformPathConverter.winToPosix(win32RelativePath);

    const isFolder = await PathTypeChecker.isFolder(absolutePath);
    const attempts = 3;
    if (isFolder) {
      Logger.debug('[Is Folder]', posixRelativePath);
      const offlineFolder = await this.createOfflineFolder(posixRelativePath);
      await this.createFolder(offlineFolder, callback, attempts);
    } else {
      Logger.debug('[Is File]', posixRelativePath);
      await this.createFile(posixRelativePath, callback, attempts);
    }
  }
}
