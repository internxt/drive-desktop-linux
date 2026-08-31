import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import fs, { createReadStream, watch } from 'fs';
import { copyFile, readdir, readFile, rm, stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import * as uuid from 'uuid';
import { TemporalFile } from '../domain/TemporalFile';
import { TemporalFilePath } from '../domain/TemporalFilePath';
import { TemporalFileRepository } from '../domain/TemporalFileRepository';
import { TemporalFileUploadSnapshot } from '../domain/upload/TemporalFileUploadSnapshot';
import { Optional } from '../../../../shared/types/Optional';
import { exec } from 'child_process';
import { ensureFolderExists } from '../../../../apps/shared/fs/ensure-folder-exists';

@Service()
export class NodeTemporalFileRepository implements TemporalFileRepository {
  /** Marks the private per-upload copies, which are never registered in the map. */
  private static readonly SNAPSHOT_SUFFIX = '.upload-snapshot';

  private readonly map = new Map<string, string>();

  constructor(private readonly folder: string) {}

  init() {
    ensureFolderExists(this.folder);
    this.removeStaleUploadSnapshots();
  }

  /**
   * Upload snapshots are removed in the uploader's `finally`, which a killed
   * process never reaches. Each one is a full copy of a file, so without this
   * every crash during an upload would cost disk that nothing later reclaims.
   */
  private removeStaleUploadSnapshots() {
    void readdir(this.folder)
      .then((entries) =>
        Promise.all(
          entries
            .filter((entry) => entry.endsWith(NodeTemporalFileRepository.SNAPSHOT_SUFFIX))
            .map((entry) => rm(path.join(this.folder, entry), { force: true })),
        ),
      )
      .catch((error) => {
        logger.warn({ msg: 'Could not remove stale upload snapshots', error });
      });
  }

  async exits(documentPath: TemporalFilePath): Promise<boolean> {
    const pathToRead = this.map.get(documentPath.value);

    if (!pathToRead) {
      return false;
    }

    return new Promise((resolve) => {
      fs.stat(pathToRead, (err) => {
        if (err) {
          resolve(false);
          return;
        }

        resolve(true);
      });
    });
  }

  create(documentPath: TemporalFilePath): Promise<void> {
    logger.debug({ msg: `Creating file: ${documentPath.value}` });
    const id = uuid.v4();

    const pathToWrite = path.join(this.folder, id);

    this.map.set(documentPath.value, pathToWrite);

    return new Promise((resolve, reject) => {
      fs.writeFile(pathToWrite, '', (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  areEqual(doc1: TemporalFilePath, doc2: TemporalFilePath): Promise<boolean> {
    const file1 = this.map.get(doc1.value);
    const file2 = this.map.get(doc2.value);

    if (!file1) {
      throw new Error(`${doc1.value} not found`);
    }
    if (!file2) {
      throw new Error(`${doc2.value} not found`);
    }

    return new Promise((resolve, reject) => {
      exec(`diff ${file1} ${file2}`, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const filesAreEqual = stdout === null;
        resolve(filesAreEqual);
      });
    });
  }

  async delete(documentPath: TemporalFilePath): Promise<void> {
    const pathToDelete = this.map.get(documentPath.value);

    if (!pathToDelete) {
      return;
    }

    const fsDeletion = new Promise<void>((resolve, reject) => {
      fs.unlink(pathToDelete, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          if (err.code === 'ENOENT') {
            logger.debug({
              msg: `Could not delete ${pathToDelete}, it already does not exist`,
            });
            resolve();
            return;
          }

          reject(err);
          return;
        }

        resolve();
      });
    });

    await fsDeletion;

    this.map.delete(documentPath.value);
  }

  async matchingDirectory(directory: string): Promise<TemporalFilePath[]> {
    const paths = Array.from(this.map.keys());

    return paths.filter((p) => path.dirname(p) === directory).map((p) => new TemporalFilePath(p));
  }

  read(documentPath: TemporalFilePath): Promise<Buffer> {
    const id = this.map.get(documentPath.value);

    if (!id) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    return readFile(id);
  }

  async write(documentPath: TemporalFilePath, buffer: Buffer, length: number, position: number): Promise<void> {
    const pathToWrite = this.map.get(documentPath.value);

    if (!pathToWrite) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    const fd = fs.openSync(pathToWrite, 'r+');
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    try {
      fs.writeSync(fd, bytes, 0, length, position);
    } finally {
      fs.closeSync(fd);
    }
  }

  async truncate(documentPath: TemporalFilePath, size: number): Promise<void> {
    const pathToWrite = this.map.get(documentPath.value);

    if (!pathToWrite) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    fs.truncateSync(pathToWrite, size);
  }

  async stream(documentPath: TemporalFilePath): Promise<Readable> {
    const pathToRead = this.map.get(documentPath.value);

    if (!pathToRead) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    return createReadStream(pathToRead);
  }

  async createUploadSnapshot(documentPath: TemporalFilePath): Promise<TemporalFileUploadSnapshot> {
    const pathToCopy = this.map.get(documentPath.value);

    if (!pathToCopy) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    const snapshotPath = path.join(this.folder, `${uuid.v4()}${NodeTemporalFileRepository.SNAPSHOT_SUFFIX}`);

    try {
      // COPYFILE_FICLONE asks for a reflink where the filesystem supports one
      // (btrfs, XFS), which makes the copy near free, and falls back to a full
      // copy everywhere else.
      await copyFile(pathToCopy, snapshotPath, fs.constants.COPYFILE_FICLONE);

      // Read from the copy, not from the mapped file: the application can still
      // be writing to that one, and a length taken from it would not describe
      // the bytes this upload is going to send.
      const { size } = await stat(snapshotPath);

      return {
        size,
        open: () => createReadStream(snapshotPath),
        dispose: () => rm(snapshotPath, { force: true }),
      };
    } catch (error) {
      // A copy that failed part way still leaves a destination behind, and the
      // caller never receives a handle it could dispose of.
      await rm(snapshotPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async find(documentPath: TemporalFilePath): Promise<Optional<TemporalFile>> {
    logger.debug({ msg: `Finding file: ${documentPath.value}` });
    const pathToSearch = this.map.get(documentPath.value);

    if (!pathToSearch) {
      return Optional.empty();
    }

    let stat: fs.Stats;

    try {
      stat = fs.statSync(pathToSearch);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        logger.debug({
          msg: 'Temporal file was removed from disk before reading attributes',
          documentPath: documentPath.value,
          pathToSearch,
        });
      }

      return Optional.empty();
    }

    const doc = TemporalFile.from({
      createdAt: stat.ctime,
      modifiedAt: stat.mtime,
      path: documentPath.value,
      size: stat.size,
      contentFilePath: pathToSearch,
    });

    return Optional.of(doc);
  }

  watchFile(documentPath: TemporalFilePath, callback: () => void): () => void {
    const pathToWatch = this.map.get(documentPath.value);

    logger.debug({ msg: `Watching file: ${documentPath.value}` });

    if (!pathToWatch) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    const watcher = watch(pathToWatch, (_, filename) => {
      if (filename !== documentPath.nameWithExtension()) {
        return;
      }

      logger.warn({ msg: `Filename: ${filename}, has been changed` });

      callback();
    });

    return () => {
      watcher.close();
    };
  }

  statFs(): Promise<{ blocks: number; bfree: number; bavail: number; files: number; ffree: number; bsize: number }> {
    return new Promise((resolve, reject) => {
      fs.statfs(this.folder, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          blocks: stats.blocks,
          bfree: stats.bfree,
          bavail: stats.bavail,
          files: stats.files,
          ffree: stats.ffree,
          bsize: stats.bsize,
        });
      });
    });
  }
}
