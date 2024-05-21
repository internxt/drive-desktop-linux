import { Service } from 'diod';
import { RemoteFileRepository } from '../../domain/RemoteFileRepository';
import { GroupFilesBySize } from './GroupFilesBySize';
import { GroupFilesInChunksBySize } from './GroupFilesInChunksBySize';
import { RemoteFile } from '../../domain/RemoteFile';

@Service()
export class FileUploaderByChunks {
  private static readonly sizes = ['small', 'medium', 'big'] as const;

  constructor(private readonly repository: RemoteFileRepository) {}

  private async uploadChunk(files: Array<RemoteFile>, signal: AbortSignal) {
    const uploadPromises = files.map((file) =>
      this.repository.upload(file.path, file.size, signal)
    );

    await Promise.all(uploadPromises);
  }

  async run(files: Array<RemoteFile>, signal: AbortSignal): Promise<void> {
    const chunks = FileUploaderByChunks.sizes.flatMap((size) => {
      const groupedBySize = GroupFilesBySize[size](files);

      return GroupFilesInChunksBySize[size](groupedBySize);
    });

    for (const chunk of chunks) {
      // eslint-disable-next-line no-await-in-loop
      await this.uploadChunk(chunk, signal);
    }
  }
}
