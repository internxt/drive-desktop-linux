import { mockDeep } from 'vitest-mock-extended';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { PendingModificationTimes } from '../../../../virtual-drive/files/application/utimens/PendingModificationTimes';
import { TemporalFileDeleter } from './TemporalFileDeleter';

const PATH = '/Private/notes/passwords.kdbx';

describe('TemporalFileDeleter', () => {
  it('drops a pending modification time along with the staged copy', async () => {
    // Otherwise the time outlives the file it was meant for, and the NEXT file
    // created at this path silently inherits a timestamp it never asked for.
    const repository = mockDeep<TemporalFileRepository>();
    const pendingModificationTimes = new PendingModificationTimes();
    pendingModificationTimes.set(PATH, new Date('2024-03-04T05:06:07.000Z'));

    await new TemporalFileDeleter(repository, pendingModificationTimes).run(PATH);

    expect(pendingModificationTimes.take(PATH)).toBeUndefined();
  });

  it('leaves a pending time for a different path alone', async () => {
    const repository = mockDeep<TemporalFileRepository>();
    const pendingModificationTimes = new PendingModificationTimes();
    const requested = new Date('2024-03-04T05:06:07.000Z');
    pendingModificationTimes.set('/Private/other.txt', requested);

    await new TemporalFileDeleter(repository, pendingModificationTimes).run(PATH);

    expect(pendingModificationTimes.take('/Private/other.txt')).toEqual(requested);
  });
});
