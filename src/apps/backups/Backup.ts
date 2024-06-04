import { Service } from 'diod';
import { FileBatchUpdater } from '../../context/local/localFile/application/update/FileBatchUpdater';
import { FileBatchUploader } from '../../context/local/localFile/application/upload/FileBatchUploader';
import { LocalFile } from '../../context/local/localFile/domain/LocalFile';
import { AbsolutePath } from '../../context/local/localFile/infrastructure/AbsolutePath';
import { LocalFolder } from '../../context/local/localFolder/domain/LocalFolder';
import LocalTreeBuilder from '../../context/local/localTree/application/LocalTreeBuilder';
import { LocalTree } from '../../context/local/localTree/domain/LocalTree';
import { FileDeleter } from '../../context/virtual-drive/files/application/delete/FileDeleter';
import { File } from '../../context/virtual-drive/files/domain/File';
import { SimpleFolderCreator } from '../../context/virtual-drive/folders/application/create/SimpleFolderCreator';
import { RemoteTreeBuilder } from '../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { RemoteTree } from '../../context/virtual-drive/remoteTree/domain/RemoteTree';
import { BackupInfo } from './BackupInfo';
import { AddedFilesBatchCreator } from './batches/AddedFilesBatchCreator';
import { ModifiedFilesBatchCreator } from './batches/ModifiedFilesBatchCreator';
import { DiffFilesCalculator, FilesDiff } from './diff/DiffFilesCalculator';
import {
  FoldersDiff,
  FoldersDiffCalculator,
} from './diff/FoldersDiffCalculator';
import Logger from 'electron-log';
import { relative } from './utils/relative';
import { BackupsIPCRenderer } from './BackupsIPCRenderer';

@Service()
export class Backup {
  constructor(
    private readonly localTreeBuilder: LocalTreeBuilder,
    private readonly remoteTreeBuilder: RemoteTreeBuilder,
    private readonly fileBatchUploader: FileBatchUploader,
    private readonly fileBatchUpdater: FileBatchUpdater,
    private readonly remoteFileDeleter: FileDeleter,
    private readonly simpleFolderCreator: SimpleFolderCreator
  ) {}

  private itemsBacked = 0;

  async run(info: BackupInfo, abortController: AbortController): Promise<void> {
    Logger.info('[BACKUPS] Backing:', info.pathname);

    Logger.info('[BACKUPS] Generating local tree');
    const local = await this.localTreeBuilder.run(
      info.pathname as AbsolutePath
    );

    Logger.info('[BACKUPS] Generating remote tree');
    const remote = await this.remoteTreeBuilder.run(info.folderId);

    const foldersDiff = FoldersDiffCalculator.calculate(local, remote);

    const filesDiff = DiffFilesCalculator.calculate(local, remote);

    BackupsIPCRenderer.send(
      'backups.total-items-calculated',
      filesDiff.total + foldersDiff.total
    );

    await this.backupFolders(foldersDiff, local, remote);

    await this.backupFiles(filesDiff, local, remote, abortController);
  }

  private async backupFolders(
    foldersDiff: FoldersDiff,
    local: LocalTree,
    remote: RemoteTree
  ) {
    Logger.info('[BACKUPS] Backing folders');

    const { added } = foldersDiff;

    Logger.info('[BACKUPS] Folders added', added.length);

    if (added.length === 0) {
      return;
    }

    const queue: Array<LocalFolder> = [];

    do {
      for (const localFolder of added) {
        const remoteParentPath = relative(
          local.root.path,
          localFolder.basedir()
        );

        const parentExists = remote.has(remoteParentPath);

        if (!parentExists) {
          queue.push(localFolder);
          continue;
        }

        const parent = remote.getParent(
          relative(local.root.path, localFolder.path)
        );

        // eslint-disable-next-line no-await-in-loop
        const folder = await this.simpleFolderCreator.run(
          relative(local.root.path, localFolder.path),
          parent.id
        );

        this.itemsBacked++;

        remote.addFolder(parent, folder);
      }
    } while (queue.length > 0);
  }

  private async backupFiles(
    filesDiff: FilesDiff,
    local: LocalTree,
    remote: RemoteTree,
    abortController: AbortController
  ) {
    Logger.info('[BACKUPS] Backing files');

    const { added, modified, deleted } = filesDiff;

    Logger.info('[BACKUPS] Files added', added.length);
    await this.uploadAndCreate(local.root.path, added, remote, abortController);

    Logger.info('[BACKUPS] Files modified', modified.size);
    await this.uploadAndUpdate(modified, local, remote, abortController);

    Logger.info('[BACKUPS] Files deleted', deleted.length);
    await this.deleteRemoteFiles(deleted, abortController);
  }

  private async uploadAndCreate(
    localRootPath: string,
    added: Array<LocalFile>,
    tree: RemoteTree,
    abortController: AbortController
  ): Promise<void> {
    const batches = AddedFilesBatchCreator.run(added);

    for (const batch of batches) {
      if (abortController.signal.aborted) {
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.fileBatchUploader.run(
        localRootPath,
        tree,
        batch,
        abortController.signal
      );
    }
  }

  private async uploadAndUpdate(
    modified: Map<LocalFile, File>,
    localTree: LocalTree,
    remoteTree: RemoteTree,
    abortController: AbortController
  ): Promise<void> {
    const batches = ModifiedFilesBatchCreator.run(modified);

    for (const batch of batches) {
      Logger.debug('Signal aborted', abortController.signal.aborted);
      if (abortController.signal.aborted) {
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.fileBatchUpdater.run(
        localTree.root,
        remoteTree,
        Array.from(batch.keys()),
        abortController.signal
      );
    }
  }

  private async deleteRemoteFiles(
    deleted: Array<File>,
    abortController: AbortController
  ) {
    for (const file of deleted) {
      if (abortController.signal.aborted) {
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.remoteFileDeleter.run(file);
    }
  }
}
