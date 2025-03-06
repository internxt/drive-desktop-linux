import { Service } from 'diod';
import { File } from '../domain/File';
import { FileRepository } from '../domain/FileRepository';
import { FileContentsUpdater } from './FileContentsUpdater';
import { StorageFilesRepository } from '../../../storage/StorageFiles/domain/StorageFilesRepository';
import { StorageFileId } from '../../../storage/StorageFiles/domain/StorageFileId';
import Logger from 'electron-log';
@Service()
export class FileRepositorySynchronizer {
  constructor(
    private readonly repository: FileRepository,
    private readonly StorageFileRepository: StorageFilesRepository,
    private readonly fileContentsUpdater: FileContentsUpdater
  ) {}

  // this method is temporal only used to override corrupted files
  async reUploadDanglingFiles(contentsIds: File['contentsId'][]) {
    try {
      // DriveFilesCollection
      // Aqui, en vez de buscar por el (FileRepository) inMemoryFileRepository
      // Hay que buscar por el (StorageFilesRepository) TypeOrmAndNodeFsStorageFilesRepository
      // Para ver si estan en la db local.
      // const files = await this.repository.searchByContentsIds(contentsIds);
      const storageFilesIds = contentsIds.map((id) => new StorageFileId(id));

      // we need to get the files that are in the storage in order to retrieve information
      const files = await this.repository.searchByContentsIds(contentsIds);
      const storageFiles = await this.StorageFileRepository.retrieveFromMultipleIds(storageFilesIds);



      //we need to get all the files from repository that are in the storage in order to retreive extra info
      files.filter((file) => storageFiles.find((storageFile) => storageFile.id.value === file.contentsId));

      for (const storageFile of storageFiles) {
        // eslint-disable-next-line no-await-in-loop
        await this.fileContentsUpdater.hardUpdateRun({
          attributes: storageFile.attributes(),
          file: {
            // eslint-disable-next-line
            path: files.find((file) => file.contentsId === storageFile.id.value)?.path!!,
            // eslint-disable-next-line
            folderId: files.find((file) => file.contentsId === storageFile.id.value)?.folderId!!,
          }
        });
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
