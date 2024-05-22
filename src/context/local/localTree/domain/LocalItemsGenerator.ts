import { LocalFileDTO } from '../infrastructure/LocalFileDTO';
import { LocalFolderDTO } from '../infrastructure/LocalFolderDTO';

export abstract class LocalItemsGenerator {
  abstract getAll(from: string): Promise<{
    files: Array<LocalFileDTO>;
    folders: Array<LocalFolderDTO>;
  }>;
  abstract root(dir: string): Promise<LocalFolderDTO>;
}
