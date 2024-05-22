import { Service } from 'diod';
import { LocalItemsGenerator } from '../domain/LocalItemsGenerator';
import { LocalFileDTO } from './LocalFileDTO';
import { LocalFolderDTO } from './LocalFolderDTO';
import fs from 'fs/promises';
import path from 'path';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';

@Service()
export class FsLocalItemsGenerator implements LocalItemsGenerator {
  async root(dir: string): Promise<LocalFolderDTO> {
    const stat = await fs.stat(dir);

    if (stat.isFile()) {
      throw new Error('A file cannot be the root of a tree');
    }

    return {
      path: dir as AbsolutePath,
      modificationTime: stat.mtime.getTime(),
    };
  }

  async getAll(
    dir: string
  ): Promise<{ files: LocalFileDTO[]; folders: LocalFolderDTO[] }> {
    const accumulator = Promise.resolve({
      files: [] as LocalFileDTO[],
      folders: [] as LocalFolderDTO[],
    });

    const dirents = await fs.readdir(dir, {
      withFileTypes: true,
    });

    return dirents.reduce(async (promise, dirent) => {
      const acc = await promise;

      const absolutePath = path.join(dir, dirent.name) as AbsolutePath;
      const stat = await fs.stat(absolutePath);

      if (dirent.isFile()) {
        acc.files.push({
          path: absolutePath,
          modificationTime: stat.mtime.getTime(),
          size: stat.size,
        });
      }

      if (dirent.isDirectory()) {
        acc.folders.push({
          path: absolutePath,
          modificationTime: stat.mtime.getTime(),
        });
      }

      return acc;
    }, accumulator);
  }
}
