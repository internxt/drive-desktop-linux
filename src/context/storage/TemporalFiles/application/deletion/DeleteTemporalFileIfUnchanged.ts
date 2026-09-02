import { Service } from 'diod';
import { TemporalFileByPathFinder } from '../find/TemporalFileByPathFinder';
import { TemporalFileDeleter } from './TemporalFileDeleter';

/**
 * Reaps the staged copy of a file whose contents have reached the cloud.
 *
 * A release uploads whenever a temporal file exists for the path, because the
 * existence of the staged copy is what signals unsaved local writes. That only
 * holds if the staged copy is removed once it has been uploaded.
 *
 * The staged copy is kept, not deleted, when it has been written again since
 * the upload: those bytes have not reached the cloud, and leaving the file in
 * place is what makes the next release upload them.
 */
@Service()
export class DeleteTemporalFileIfUnchanged {
  constructor(
    private readonly finder: TemporalFileByPathFinder,
    private readonly deleter: TemporalFileDeleter,
  ) {}

  async run(path: string, uploadedAt: Date): Promise<void> {
    const temporalFile = await this.finder.run(path);

    if (!temporalFile) {
      return;
    }

    if (temporalFile.modifiedTime > uploadedAt) {
      return;
    }

    await this.deleter.run(path);
  }
}
