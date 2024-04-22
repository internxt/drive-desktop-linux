import { Service } from 'diod';
import Logger from 'electron-log';
import fs, { createReadStream, watch } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import * as uuid from 'uuid';
import { Document } from '../domain/Document';
import { DocumentPath } from '../domain/DocumentPath';
import { DocumentRepository } from '../domain/DocumentRepository';
import { Optional } from '../../../../shared/types/Optional';

@Service()
export class FsDocumentRepository implements DocumentRepository {
  private readonly map = new Map<string, string>();

  constructor(
    private readonly readBaseFolder: string,
    private readonly writeBaseFolder: string
  ) {}

  create(documentPath: DocumentPath): Promise<void> {
    const id = uuid.v4();

    const pathToWrite = path.join(this.writeBaseFolder, id);

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

  async delete(documentPath: DocumentPath): Promise<void> {
    const pathToDelete = this.map.get(documentPath.value);

    if (!pathToDelete) {
      throw new Error('Document not found');
    }

    const fsDeletion = new Promise<void>((resolve, reject) => {
      fs.unlink(pathToDelete, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          if (err.code !== 'ENOENT') {
            Logger.debug(
              `Could not delete ${pathToDelete}, it already does not exists`
            );
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

  async matchingDirectory(directory: string): Promise<DocumentPath[]> {
    const paths = Array.from(this.map.keys());

    return paths
      .filter((p) => path.dirname(p) === directory)
      .map((p) => new DocumentPath(p));
  }

  read(documentPath: DocumentPath): Promise<Buffer> {
    const id = this.map.get(documentPath.value);

    if (!id) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    const pathToRead = path.join(this.readBaseFolder, id);

    return readFile(pathToRead);
  }

  async write(
    documentPath: DocumentPath,
    buffer: Buffer,
    length: number,
    position: number
  ): Promise<void> {
    const pathToWrite = this.map.get(documentPath.value);

    if (!pathToWrite) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    const fd = fs.openSync(pathToWrite, 'r+');

    try {
      fs.writeSync(fd, buffer, 0, length, position);
    } finally {
      fs.closeSync(fd);
    }
  }

  async stream(documentPath: DocumentPath): Promise<Readable> {
    const pathToRead = this.map.get(documentPath.value);

    if (!pathToRead) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    return createReadStream(pathToRead);
  }

  async find(documentPath: DocumentPath): Promise<Optional<Document>> {
    const pathToSearch = this.map.get(documentPath.value);

    if (!pathToSearch) {
      return Optional.empty();
    }

    const stat = fs.statSync(pathToSearch);

    const doc = Document.from({
      createdAt: stat.ctime,
      modifiedAt: stat.mtime,
      path: documentPath.value,
      size: stat.size,
    });

    return Optional.of(doc);
  }

  watchFile(documentPath: DocumentPath, callback: () => void): () => void {
    const pathToWatch = this.map.get(documentPath.value);

    if (!pathToWatch) {
      throw new Error(`Document with path ${documentPath.value} not found`);
    }

    const watcher = watch(pathToWatch, (_, filename) => {
      if (filename !== documentPath.nameWithExtension()) {
        return;
      }

      Logger.warn(filename, ' has been changed');

      callback();
    });

    return () => {
      watcher.close();
    };
  }
}
