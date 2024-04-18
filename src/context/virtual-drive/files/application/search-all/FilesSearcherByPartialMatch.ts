import { File, FileAttributes } from '../../domain/File';
import { FileRepository } from '../../domain/FileRepository';
import { Service } from 'diod';

@Service()
export class FilesSearcherByPartialMatch {
  constructor(private readonly repository: FileRepository) {}

  async run(partial: Partial<FileAttributes>): Promise<Array<File>> {
    return this.repository.matchingPartial(partial);
  }
}
