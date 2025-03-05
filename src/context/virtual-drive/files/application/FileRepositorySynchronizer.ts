import { Service } from 'diod';
import { File } from '../domain/File';
import { FileRepository } from '../domain/FileRepository';
import { FileContentsUpdater } from './FileContentsUpdater';
@Service()
export class FileRepositorySynchronizer {
  constructor(
    private readonly repository: FileRepository,
    private readonly fileContentsUpdater: FileContentsUpdater
  ) {}

  async overrideCorruptedFiles(contentsIds: File['contentsId'][]) {
    const files = await this.repository.searchByContentsIds(contentsIds);

    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      await this.fileContentsUpdater.hardUpdateRun(file.attributes());
    }
  }

  async run(files: Array<File>): Promise<boolean> {
    // Resets the repository since replaced files become duplicated as
    // not all applications use the replace endpoint
    await this.repository.clear();

    const addPromises = files.map((file: File) => this.repository.upsert(file));

    const addResults = await Promise.all(addPromises);

    return addResults.some((newerFileAdded) => newerFileAdded);
  }
}
