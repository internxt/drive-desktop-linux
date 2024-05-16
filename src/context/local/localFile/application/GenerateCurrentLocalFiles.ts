import { Service } from 'diod';
import { LocalFile } from '../domain/LocalFile';
import { LocalFileRepository } from '../domain/LocalFileRepository';
import { AbsolutePath } from '../infrastructure/AbsolutePath';

@Service()
export default class GenerateCurrentLocalFiles {
  constructor(private readonly repository: LocalFileRepository) {}

  async run(folder: AbsolutePath): Promise<Array<LocalFile>> {
    const files = await this.repository.files(folder);

    const subfolders = await this.repository.folders(folder);

    const recursiveSearch = subfolders.map(async (subfolder) => {
      const filesInSubfolder = await this.run(subfolder);

      filesInSubfolder.forEach((file) => files.push(file));
    });

    await Promise.all(recursiveSearch);

    return files;
  }
}
