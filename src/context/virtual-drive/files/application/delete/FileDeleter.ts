import { Service } from 'diod';
import { File } from '../../domain/File';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';

@Service()
export class FileDeleter {
  constructor(private readonly fs: RemoteFileSystem) {}

  async run(file: File) {
    this.fs.delete(file);
  }
}
