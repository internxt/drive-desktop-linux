import { Service } from 'diod';
import { File } from '../../domain/File';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import Logger from 'electron-log';

@Service()
export class FileDeleter {
  constructor(private readonly fs: RemoteFileSystem) {}

  async run(file: File) {
    Logger.debug('Deleting', file);
    await this.fs.delete(file);
  }
}
