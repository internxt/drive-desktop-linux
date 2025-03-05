import { Container } from 'diod';
import Logger from 'electron-log';
import { StorageClearer } from '../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { FileRepositorySynchronizer } from '../../../context/virtual-drive/files/application/FileRepositorySynchronizer';
import { FolderRepositorySynchronizer } from '../../../context/virtual-drive/folders/application/FolderRepositorySynchronizer';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { VirtualDrive } from '../virtual-drive/VirtualDrive';
import { FuseDriveStatus } from './FuseDriveStatus';
import { CreateCallback } from './callbacks/CreateCallback';
import { GetAttributesCallback } from './callbacks/GetAttributesCallback';
import { GetXAttributeCallback } from './callbacks/GetXAttributeCallback';
import { MakeDirectoryCallback } from './callbacks/MakeDirectoryCallback';
import { OpenCallback } from './callbacks/OpenCallback';
import { ReadCallback } from './callbacks/ReadCallback';
import { ReaddirCallback } from './callbacks/ReaddirCallback';
import { ReleaseCallback } from './callbacks/ReleaseCallback';
import { RenameMoveOrTrashCallback } from './callbacks/RenameOrMoveCallback';
import { TrashFileCallback } from './callbacks/TrashFileCallback';
import { TrashFolderCallback } from './callbacks/TrashFolderCallback';
import { WriteCallback } from './callbacks/WriteCallback';
import { mountPromise, unmountPromise } from './helpers';
import { StorageRemoteChangesSyncher } from '../../../context/storage/StorageFiles/application/sync/StorageRemoteChangesSyncher';
import { ThumbnailSynchronizer } from '../../../context/storage/thumbnails/application/sync/ThumbnailSynchronizer';
import { EventEmitter } from 'stream';
import { getExistingFiles } from '../../main/remote-sync/service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fuse = require('@gcas/fuse');

const STORAGE_MIGRATION_DATE = new Date('2025-02-19T12:00:00Z');
const FIX_DEPLOYMENT_DATE = new Date('2025-03-06T20:00:00Z'); // modify this date

export class FuseApp extends EventEmitter {
  private status: FuseDriveStatus = 'UNMOUNTED';
  private static readonly MAX_INT_32 = 2147483647;
  private _fuse: any;

  constructor(
    private readonly virtualDrive: VirtualDrive,
    private readonly container: Container,
    private readonly localRoot: string,
    private readonly remoteRoot: number
  ) {
    super();
  }

  private getOpt() {
    const readdir = new ReaddirCallback(this.container);
    const getattr = new GetAttributesCallback(this.container);
    const open = new OpenCallback(this.virtualDrive);
    const read = new ReadCallback(this.container);
    const renameOrMove = new RenameMoveOrTrashCallback(this.container);
    const create = new CreateCallback(this.container);
    const makeDirectory = new MakeDirectoryCallback(this.container);
    const trashFile = new TrashFileCallback(this.container);
    const trashFolder = new TrashFolderCallback(this.container);
    const write = new WriteCallback(this.container);
    const release = new ReleaseCallback(this.container);
    const getXAttributes = new GetXAttributeCallback(this.virtualDrive);

    return {
      getattr: getattr.handle.bind(getattr),
      readdir: readdir.handle.bind(readdir),
      open: open.handle.bind(open),
      read: read.execute.bind(read),
      rename: renameOrMove.handle.bind(renameOrMove),
      create: create.handle.bind(create),
      write: write.execute.bind(write),
      mkdir: makeDirectory.handle.bind(makeDirectory),
      release: release.handle.bind(release),
      unlink: trashFile.handle.bind(trashFile),
      rmdir: trashFolder.handle.bind(trashFolder),
      getxattr: getXAttributes.handle.bind(getXAttributes),
    };
  }

  async start(): Promise<void> {
    const ops = this.getOpt();

    await this.update();

    this._fuse = new fuse(this.localRoot, ops, {
      debug: false,
      force: true,
      maxRead: FuseApp.MAX_INT_32,
    });

    try {
      await mountPromise(this._fuse);
      this.status = 'MOUNTED';
      Logger.info('[FUSE] mounted');
      this.emit('mounted');
    } catch (firstMountError) {
      Logger.error(`[FUSE] mount error: ${firstMountError}`);
      try {
        await unmountPromise(this._fuse);
        await mountPromise(this._fuse);
        this.status = 'MOUNTED';
        Logger.info('[FUSE] mounted');
        this.emit('mounted');
      } catch (err) {
        this.status = 'ERROR';
        Logger.error(`[FUSE] mount error: ${err}`);
        this.emit('mount-error');
      }
    }
  }

  async stop(): Promise<void> {
    //no-op
  }

  async clearCache(): Promise<void> {
    await this.container.get(StorageClearer).run();
  }

  async update(): Promise<void> {
    try {
      const tree = await this.container
        .get(RemoteTreeBuilder)
        .run(this.remoteRoot);
      const fileRepository = this.container.get(FileRepositorySynchronizer);
      await fileRepository.run(tree.files);
      await this.container.get(ThumbnailSynchronizer).run(tree.files);

      await this.container.get(FolderRepositorySynchronizer).run(tree.folders);

      await this.container.get(StorageRemoteChangesSyncher).run();

      // Get All files from local db
      // ? Why is returning more files than the ones in internxt drive?
      const existingFiles = await getExistingFiles();

      const affectedFilesIds = existingFiles.filter(
        (file) =>
          new Date(file.createdAt) >= STORAGE_MIGRATION_DATE &&
          new Date(file.createdAt) < FIX_DEPLOYMENT_DATE
      ).map((file) => file.fileId);

      await fileRepository
        .overrideCorruptedFiles(affectedFilesIds);

      Logger.info('[FUSE] Tree updated successfully');
    } catch (err) {
      Logger.error('[FUSE] Updating the tree ', err);
    }
  }

  getStatus() {
    return this.status;
  }

  async mount() {
    try {
      await unmountPromise(this._fuse);
      await mountPromise(this._fuse);
      this.status = 'MOUNTED';
    } catch (err) {
      this.status = 'ERROR';
      Logger.error(`[FUSE] mount error: ${err}`);
    }

    this.emit('mounted');

    return this.status;
  }
}
