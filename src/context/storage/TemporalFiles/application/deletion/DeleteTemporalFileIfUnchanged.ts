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

  async run(path: string, uploadedRevision: number | undefined): Promise<void> {
    const temporalFile = await this.finder.run(path);

    if (!temporalFile) {
      return;
    }

    // Not knowing what was uploaded is a reason to keep the staged copy, not to
    // delete it.
    if (uploadedRevision === undefined || temporalFile.revision === undefined) {
      return;
    }

    // Any difference at all keeps the file. The revision is a counter owned by
    // the repository and bumped by every mutation it performs, so a change is
    // never missed: comparing modification times would miss an in-place edit
    // that alters neither the length nor the quantised timestamp, which is
    // exactly what a re-encrypted database or a flipped byte looks like.
    if (temporalFile.revision !== uploadedRevision) {
      return;
    }

    // A write landing between the check above and the unlink below is still
    // lost. That window cannot be closed from here: the filesystem offers no
    // delete-if-unchanged, and there is no per-path lock shared with the
    // writers. The create path (DeleteTemporalFileOnFileCreated) does not check
    // at all. This narrows the window rather than closing it.
    await this.deleter.run(path);
  }
}
