import { Service } from 'diod';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFilePath } from '../../domain/TemporalFilePath';
import { PendingModificationTimes } from '../../../../virtual-drive/files/application/utimens/PendingModificationTimes';

@Service()
export class TemporalFileDeleter {
  constructor(
    private readonly repository: TemporalFileRepository,
    private readonly pendingModificationTimes: PendingModificationTimes,
  ) {}

  async run(path: string): Promise<void> {
    const documentPath = new TemporalFilePath(path);

    await this.repository.delete(documentPath);

    // Every way a staged copy stops existing comes through here, which is why
    // the pending time is dropped here rather than at each call site: a missed
    // one would leave a time behind that the NEXT file created at this path
    // would silently inherit, having never asked for it.
    //
    // Harmless on the reap after a successful upload, where the time has
    // already been taken and there is nothing left to drop.
    this.pendingModificationTimes.forget(path);
  }
}
