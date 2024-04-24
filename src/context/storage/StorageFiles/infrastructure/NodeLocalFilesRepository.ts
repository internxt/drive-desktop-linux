import { Service } from 'diod';
import { Readable } from 'form-data';
import { readFile, readdir, unlink } from 'fs/promises';
import path from 'path';
import { ensureFolderExists } from '../../../../apps/shared/fs/ensure-folder-exists';
import { WriteReadableToFile } from '../../../../apps/shared/fs/write-readable-to-file';
import { StorageFileId } from '../domain/StorageFileId';
import { StorageFileRepository } from '../domain/StorageFileRepository';

@Service()
export class NodeStorageFilesRepository implements StorageFileRepository {
  private readonly map = new Map<string, string>();
  constructor(private readonly baseFolder: string) {}

  async init(): Promise<void> {
    ensureFolderExists(this.baseFolder);

    const files = await readdir(this.baseFolder);

    files.forEach((file) => {
      const id = path.basename(file);

      this.map.set(id, path.join(this.baseFolder, id));
    });
  }

  async store(id: StorageFileId, readable: Readable): Promise<void> {
    const pathToWrite = path.join(this.baseFolder, id.value);

    await WriteReadableToFile.write(readable, pathToWrite);

    this.map.set(id.value, pathToWrite);
  }

  async read(id: StorageFileId): Promise<Buffer> {
    if (!this.map.has(id.value)) {
      throw new Error(`Local file ${id.value} not found`);
    }

    const pathToRead = path.join(this.baseFolder, id.value);

    const buffer = await readFile(pathToRead);

    return buffer;
  }

  async exists(id: StorageFileId): Promise<boolean> {
    return this.map.has(id.value);
  }

  async delete(id: StorageFileId): Promise<void> {
    const pathToUnlink = path.join(this.baseFolder, id.value);

    await unlink(pathToUnlink);

    this.map.delete(id.value);
  }

  async deleteAll(): Promise<void> {
    const iterator = this.map.keys();

    let result = iterator.next();

    while (!result.done) {
      // eslint-disable-next-line no-await-in-loop
      await this.delete(new StorageFileId(result.value));
      result = iterator.next();
    }
  }
}
