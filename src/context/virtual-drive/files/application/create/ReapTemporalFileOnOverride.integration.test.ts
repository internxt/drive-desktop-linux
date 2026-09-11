import { Environment } from '@internxt/inxt-js';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeTemporalFileRepository } from '../../../../storage/TemporalFiles/infrastructure/NodeTemporalFileRepository';
import { TemporalFilePath } from '../../../../storage/TemporalFiles/domain/TemporalFilePath';
import { TemporalFileByPathFinder } from '../../../../storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileDeleter } from '../../../../storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { DeleteTemporalFileIfUnchanged } from '../../../../storage/TemporalFiles/application/deletion/DeleteTemporalFileIfUnchanged';
import { TemporalFileUploadedDomainEvent } from '../../../../storage/TemporalFiles/domain/upload/TemporalFileUploadedDomainEvent';
import { NodeJsEventBus } from '../../../shared/infrastructure/NodeJsEventBus';
import { CreateFileOnTemporalFileUploaded } from './CreateFileOnTemporalFileUploaded';
import { FileCreatorTestClass } from '../../__test-helpers__/FileCreatorTestClass';
import { FileOverriderTestClass } from '../../__test-helpers__/FileOverriderTestClass';
import { FileMother } from '../../domain/__test-helpers__/FileMother';
import { SyncFileMessenger } from '../../domain/SyncFileMessenger';
import { PendingModificationTimes } from '../utimens/PendingModificationTimes';

const PATH = '/Private/notes/passwords.kdbx';

/**
 * Exercises the real bus, the real repository and the real reaper, so that a
 * no-op reaper cannot keep these green. Only the remote calls are doubled.
 */
describe('reaping the staged copy after an override, end to end', () => {
  let folder: string;
  let repository: NodeTemporalFileRepository;
  let bus: NodeJsEventBus;
  let overrider: FileOverriderTestClass;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-temporal-files-'));
    repository = new NodeTemporalFileRepository(folder);
    repository.init();

    overrider = new FileOverriderTestClass();

    const subscriber = new CreateFileOnTemporalFileUploaded(
      new FileCreatorTestClass(),
      overrider,
      {} as Environment,
      'test-bucket',
      new DeleteTemporalFileIfUnchanged(
        new TemporalFileByPathFinder(repository),
        new TemporalFileDeleter(repository, new PendingModificationTimes()),
      ),
    );

    bus = new NodeJsEventBus();
    bus.addSubscribers([subscriber]);
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  async function stageAndUpload() {
    const documentPath = new TemporalFilePath(PATH);
    await repository.create(documentPath);
    const staged = (await repository.find(documentPath)).get();

    return {
      documentPath,
      contentFilePath: staged.contentFilePath as string,
      event: new TemporalFileUploadedDomainEvent({
        aggregateId: '0000000000000000000000bb',
        size: staged.size.value,
        path: PATH,
        replaces: '0000000000000000000000aa',
        contentFilePath: staged.contentFilePath,
        uploadedRevision: staged.revision,
      }),
    };
  }

  /** The bus emits without awaiting async subscribers, so poll rather than guess a turn count. */
  async function settled(assertion: () => void | Promise<void>) {
    await vi.waitFor(assertion, { timeout: 2000, interval: 10 });
  }

  it('leaves nothing for a later release to upload', async () => {
    const { documentPath, contentFilePath, event } = await stageAndUpload();
    overrider.mock.mockResolvedValue(FileMother.noThumbnable());

    await bus.publish([event]);

    await settled(async () => {
      expect((await repository.find(documentPath)).isPresent()).toBe(false);
      expect(existsSync(contentFilePath)).toBe(false);
    });
  });

  it('keeps a staged copy written while the upload was streaming', async () => {
    // The write lands after the upload read the file. Its bytes may not be in
    // the uploaded object, so the staged copy must survive for the next release.
    const documentPath = new TemporalFilePath(PATH);
    await repository.create(documentPath);
    const staged = (await repository.find(documentPath)).get();
    const revisionTheUploadRead = staged.revision;
    const contentFilePath = staged.contentFilePath as string;

    await repository.write(documentPath, Buffer.from('bytes written mid-stream'), 24, 0);
    expect((await repository.find(documentPath)).get().revision).not.toBe(revisionTheUploadRead);

    const event = new TemporalFileUploadedDomainEvent({
      aggregateId: '0000000000000000000000bb',
      size: staged.size.value,
      path: PATH,
      replaces: '0000000000000000000000aa',
      contentFilePath,
      uploadedRevision: revisionTheUploadRead,
    });

    overrider.mock.mockResolvedValue(FileMother.noThumbnable());

    await bus.publish([event]);

    await settled(async () => {
      expect(overrider.mock).toHaveBeenCalled();
    });
    expect((await repository.find(documentPath)).isPresent()).toBe(true);
    expect(existsSync(contentFilePath)).toBe(true);
  });

  it('does not report a failed reap as an upload failure to the user', async () => {
    // The override has already committed. A cleanup failure must not surface as
    // an UPLOAD_ERROR issue, which is what the catch in on() raises.
    const { event } = await stageAndUpload();
    overrider.mock.mockResolvedValue(FileMother.noThumbnable());
    const notifier = { issues: vi.fn().mockResolvedValue(undefined), created: vi.fn() };

    const subscriber = new CreateFileOnTemporalFileUploaded(
      new FileCreatorTestClass(),
      overrider,
      {} as Environment,
      'test-bucket',
      {
        run: vi.fn().mockRejectedValue(new Error('EACCES on the staging file')),
      } as unknown as DeleteTemporalFileIfUnchanged,
      notifier as unknown as SyncFileMessenger,
    );

    await subscriber.on(event);

    expect(overrider.mock).toHaveBeenCalled();
    expect(notifier.issues).not.toHaveBeenCalled();
  });

  it('keeps the staged copy when the override fails, so the next release retries', async () => {
    const { documentPath, event } = await stageAndUpload();
    overrider.mock.mockRejectedValue(new Error('the remote override failed'));

    await bus.publish([event]);

    await settled(async () => {
      expect(overrider.mock).toHaveBeenCalled();
    });
    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });
});
