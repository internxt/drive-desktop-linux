import { Service } from 'diod';
import { File } from '../domain/File';
import { FileRepository } from '../domain/FileRepository';
import Logger from 'electron-log';

@Service()
export class FileRepositorySynchronizer {
  constructor(private readonly repository: FileRepository) {}

  async fixDanglingFiles(contentsIds: Array<File['contentsId']>): Promise<void> {
    try {
      const files = await this.repository.searchByArrayOfContentsId(contentsIds);
      for (const file of files) {
        // TODO: Check to try to download the file
      }
    } catch (error) {
      Logger.error(
        `[DANGLING FILE] error trying to retrieve files with error: ${error}`
      );
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
