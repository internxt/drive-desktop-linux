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

  async run(path: string, uploadedModifiedTime: Date | undefined): Promise<void> {
    const temporalFile = await this.finder.run(path);

    if (!temporalFile) {
      return;
    }

    // Equality, not "newer than". A wall-clock ordering test against the moment
    // the upload finished treats a write that landed WHILE the upload was
    // streaming as unchanged, because its modification time is earlier; those
    // bytes may not be in the uploaded object. It is also at the mercy of clock
    // adjustments. Comparing against the modification time the upload actually
    // read has neither problem, and any difference at all keeps the file.
    //
    // Not knowing what was uploaded is a reason to keep the staged copy, not to
    // delete it.
    if (uploadedModifiedTime === undefined) {
      return;
    }

    if (temporalFile.modifiedTime.getTime() !== uploadedModifiedTime.getTime()) {
      return;
    }

    // A write landing between the check above and the unlink below is still
    // lost. That window cannot be closed from here: the filesystem offers no
    // delete-if-unchanged, and the create path (DeleteTemporalFileOnFileCreated)
    // does not check at all. This narrows the window rather than closing it.
    await this.deleter.run(path);
  }
}
