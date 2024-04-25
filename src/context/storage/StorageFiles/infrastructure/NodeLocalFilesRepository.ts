import { Service } from 'diod';
import { Readable } from 'form-data';
import { readFile, readdir, unlink } from 'fs/promises';
import path from 'path';
import { ensureFolderExists } from '../../../../apps/shared/fs/ensure-folder-exists';
import { WriteReadableToFile } from '../../../../apps/shared/fs/write-readable-to-file';
import { StorageFileId } from '../domain/StorageFileId';
import { StorageFileRepository } from '../domain/StorageFileRepository';
import { StorageFilePath } from '../domain/StorageFilePath';
import { StorageFile, StorageFileAttributes } from '../domain/StorageFile';
import { PathLike, statSync } from 'fs';
import Logger from 'electron-log';

@Service()
export class NodeStorageFilesRepository implements StorageFileRepository {
  private readonly storageIdStorageFileMap = new Map<
    StorageFileId['value'],
    StorageFileAttributes
  >();

  constructor(private readonly baseFolder: string) {}

  private calculateRelativePath(folderPath: string): string {
    const relativePath = path.relative(this.baseFolder, folderPath);
    const relativeFolders = path.dirname(relativePath);
    const fileName = path.basename(folderPath);

    return path.join(relativeFolders, fileName);
  }

  private calculateFsPath(file: StorageFile): PathLike {
    return path.join(this.baseFolder, file.id.value);
  }

  private save(file: StorageFile): void {
    this.storageIdStorageFileMap.set(file.id.value, file.attributes());
  }

  async init(): Promise<void> {
    ensureFolderExists(this.baseFolder);

    const paths = await readdir(this.baseFolder);

    paths
      .map((absolutePath) => {
        Logger.debug(absolutePath);
        const id = path.basename(absolutePath);
        // TODO: USE SQL LITE TABLE
        const fsPath = this.calculateRelativePath(absolutePath);

        const { size } = statSync(fsPath);

        return StorageFile.from({
          id: id,
          path: fsPath,
          size: size,
        });
      })
      .forEach((file) =>
        this.storageIdStorageFileMap.set(file.id.value, file.attributes())
      );
  }

  async store(file: StorageFile, readable: Readable): Promise<void> {
    await WriteReadableToFile.write(readable, this.calculateFsPath(file));

    this.save(file);
  }

  async read(id: StorageFileId): Promise<Buffer> {
    if (!this.storageIdStorageFileMap.has(id.value)) {
      throw new Error(`Local file ${id.value} not found`);
    }

    const pathToRead = path.join(this.baseFolder, id.value);

    const buffer = await readFile(pathToRead);

    return buffer;
  }

  async exists(storageFilePath: StorageFilePath): Promise<boolean> {
    const attributesIterator = this.storageIdStorageFileMap.values();
    const allFilesAttributes = Array.from(attributesIterator);

    return allFilesAttributes.some(
      (attributes) => storageFilePath.value === attributes.path
    );
  }

  async retrieve(storageFilePath: StorageFilePath): Promise<StorageFile> {
    const attributesIterator = this.storageIdStorageFileMap.values();
    const allFilesAttributes = Array.from(attributesIterator);

    const attributes = allFilesAttributes.find(
      (attributes) => storageFilePath.value === attributes.path
    );

    if (!attributes) {
      throw new Error(`Storage file ${storageFilePath.value} not found`);
    }

    return StorageFile.from(attributes);
  }

  async delete(id: StorageFileId): Promise<void> {
    const pathToUnlink = path.join(this.baseFolder, id.value);

    await unlink(pathToUnlink);

    this.storageIdStorageFileMap.delete(id.value);
  }

  async deleteAll(): Promise<void> {
    const iterator = this.storageIdStorageFileMap.keys();

    let result = iterator.next();

    while (!result.done) {
      // eslint-disable-next-line no-await-in-loop
      await this.delete(new StorageFileId(result.value));
      result = iterator.next();
    }
  }
}
