import { Service } from 'diod';
import { File } from '../../../../virtual-drive/files/domain/File';
import { ThumbnailsRepository } from '../../domain/ThumbnailsRepository';

@Service()
export class ThumbnailSynchronizer {
  constructor(private readonly local: ThumbnailsRepository) {}

  // TODO: PB-5990 Implement thumbnail creation (upload) and retrieval (download) for thumbnable files.
  async run(files: Array<File>): Promise<void> {
    const noThumbnable = files.filter((file) => !file.isThumbnable());

    const defaultPromises = noThumbnable.map(async (file) => {
      const alreadyExists = await this.local.has(file);

      if (alreadyExists) return;

      return this.local.default(file);
    });

    await Promise.all(defaultPromises);
  }
}
