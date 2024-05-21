import { Service } from 'diod';
import { FilesIndexedByPath } from '../../shared/application/FilesIndexedByPath';
import { LocalFile } from '../domain/LocalFile';
import { LocalFileRepository } from '../domain/LocalFileRepository';
import { AbsolutePath } from '../infrastructure/AbsolutePath';

@Service()
export default class CurrentLocalFilesProvider {
  constructor(private readonly repository: LocalFileRepository) {}

  async run(folder: AbsolutePath): Promise<FilesIndexedByPath<LocalFile>> {
    const files = await this.repository.files(folder);

    const filesIndexedByPath = files.reduce<FilesIndexedByPath<LocalFile>>(
      (accumulator, file) => {
        accumulator.set(file.path, file);

        return accumulator;
      },
      new Map()
    );

    const subfolders = await this.repository.folders(folder);

    const recursiveSearch = subfolders.map(async (subfolder) => {
      const filesInSubfolder = await this.run(subfolder);

      filesInSubfolder.forEach((file) =>
        filesIndexedByPath.set(file.path, file)
      );
    });

    await Promise.all(recursiveSearch);

    return filesIndexedByPath;
  }
}
