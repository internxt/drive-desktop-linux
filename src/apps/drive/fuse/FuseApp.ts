import { Container } from 'diod';
import Logger from 'electron-log';
import { StorageClearer } from '../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { FileRepositorySynchronizer } from '../../../context/virtual-drive/files/application/FileRepositorySynchronizer';
import { FolderRepositorySynchronizer } from '../../../context/virtual-drive/folders/application/FolderRepositorySynchronizer';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { VirtualDrive } from '../VirtualDrive';
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
import { exec } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fuse = require('@gcas/fuse');

export class FuseApp extends EventEmitter {
  private status: FuseDriveStatus = 'UNMOUNTED';
  private static readonly MAX_INT_32 = 2147483647;
  private _fuse: any;
  private isUnmounting = false;
  private isLocked = false;

  constructor(
    private readonly virtualDrive: VirtualDrive,
    private readonly container: Container,
    private readonly localRoot: string,
    private readonly remoteRoot: number
  ) {
    super();

    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
    process.on('exit', async () => {
      Logger.info('[FUSE] Process exit detected');
      await this.stop();
    });
  }

  private async handleShutdown() {
    Logger.info('[FUSE] Shutdown signal received');
    try {
      await this.stop();
      Logger.info('[FUSE] Shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      Logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  async verifyUnmount(mountPoint: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`mount | grep ${mountPoint}`, (error, stdout) => {
        if (error) {
          resolve(false); // Not mounted
          return;
        }
        resolve(stdout.trim().length === 0);
      });
    });
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

  lock() {
    this.isLocked = true;
    Logger.info('[FUSE] Operations locked');
  }

  unlock() {
    this.isLocked = false;
    Logger.info('[FUSE] Operations unlocked');
  }

  async start(): Promise<void> {
    if (this.isUnmounting || this.isLocked) {
      Logger.warn(
        '[FUSE] Cannot start while unmounting or another operation is in progress'
      );
      return;
    }

    this.isLocked = true;
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
      Logger.info('[FUSE] Mounted');
      this.emit('mounted');
    } catch (error) {
      Logger.error(`[FUSE] mount error: ${error}`);
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
    } finally {
      this.unlock();
    }
  }

  async stop(): Promise<void> {
    if (this._fuse && !this.isUnmounting) {
      this.isUnmounting = true;
      Logger.info('[FUSE] Attempting to unmount');
      try {
        await unmountPromise(this._fuse);
        const isUnmounted = await this.verifyUnmount(this.localRoot);
        if (isUnmounted) {
          this.status = 'UNMOUNTED';
          Logger.info('[FUSE] Unmounted successfully and verified');
          this.emit('unmounted');
        } else {
          throw new Error('Failed to verify unmount');
        }
      } catch (error) {
        this.status = 'ERROR';
        Logger.error(`[FUSE] Unmount error: ${error}`);
        this.emit('unmount-error');
      } finally {
        this.isUnmounting = false;
      }
    } else {
      Logger.warn('[FUSE] _fuse is undefined or already unmounted');
    }
  }

  async clearCache(): Promise<void> {
    await this.container.get(StorageClearer).run();
  }

  async update(): Promise<void> {
    try {
      const tree = await this.container
        .get(RemoteTreeBuilder)
        .run(this.remoteRoot);

      await this.container.get(FileRepositorySynchronizer).run(tree.files);
      await this.container.get(ThumbnailSynchronizer).run(tree.files);

      await this.container.get(FolderRepositorySynchronizer).run(tree.folders);

      await this.container.get(StorageRemoteChangesSyncher).run();

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
