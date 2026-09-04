import { Environment } from '@internxt/inxt-js';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
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
import { uploadAndCreateThumbnail } from '../../../../../backend/features/thumbnails/upload-and-create-thumbnail';
import { PendingModificationTimes } from '../utimens/PendingModificationTimes';

const PATH = '/Private/notes/passwords.kdbx';

vi.mock('../../../../../backend/features/thumbnails/generate-thumbnail', () => ({
  generateThumbnail: vi.fn().mockReturnValue({ data: Buffer.from('thumbnail bytes') }),
}));

vi.mock('../../../../../backend/features/thumbnails/upload-and-create-thumbnail', () => ({
  uploadAndCreateThumbnail: vi.fn().mockResolvedValue({}),
}));

/**
 * The create half of the reaping, exercised the same way the override half is:
 * the real bus, the real repository and the real reaper, with only the remote
 * call doubled.
 *
 * This half used to reap from a subscriber on FileCreatedDomainEvent that
 * deleted unconditionally, so a write landing after the upload read the file
 * and before the reap ran lost those bytes. An upload that commits and then
 * sees a write still reports success, so this is the common shape of the race
 * rather than the rare one.
 */
describe('reaping the staged copy after a create, end to end', () => {
  let folder: string;
  let repository: NodeTemporalFileRepository;
  let bus: NodeJsEventBus;
  let creator: FileCreatorTestClass;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-temporal-files-'));
    repository = new NodeTemporalFileRepository(folder);
    repository.init();

    creator = new FileCreatorTestClass();

    const subscriber = new CreateFileOnTemporalFileUploaded(
      creator,
      new FileOverriderTestClass(),
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
    creator.mock.mockResolvedValue(FileMother.noThumbnable());

    await bus.publish([event]);

    await settled(async () => {
      expect((await repository.find(documentPath)).isPresent()).toBe(false);
      expect(existsSync(contentFilePath)).toBe(false);
    });
  });

  it('keeps a staged copy written while the upload was streaming', async () => {
    // The write lands after the upload read the file, so its bytes may not be
    // in the uploaded object. Deleting here is the data-loss path this whole
    // change exists to close.
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
      contentFilePath,
      uploadedRevision: revisionTheUploadRead,
    });

    creator.mock.mockResolvedValue(FileMother.noThumbnable());

    await bus.publish([event]);

    await settled(async () => {
      expect(creator.mock).toHaveBeenCalled();
    });
    expect((await repository.find(documentPath)).isPresent()).toBe(true);
    expect(existsSync(contentFilePath)).toBe(true);
  });

  it('carries on past a failed reap instead of abandoning the work after it', async () => {
    // The file has already been created remotely, so a cleanup failure must be
    // swallowed rather than thrown.
    //
    // Asserting only that no issue is raised would be vacuous on this half:
    // on() gates notifier.issues behind event.replaces, which is always falsy
    // here, so that assertion holds whether or not the inner try/catch exists.
    // The thumbnail upload is the observable that discriminates, because an
    // escaping throw would skip it.
    const { event: staged } = await stageAndUpload();
    const event = new TemporalFileUploadedDomainEvent({
      aggregateId: staged.aggregateId,
      size: staged.size,
      path: staged.path,
      contentFilePath: staged.contentFilePath,
      uploadedRevision: staged.uploadedRevision,
      fileBuffer: Buffer.from('image bytes'),
    });

    creator.mock.mockResolvedValue(FileMother.noThumbnable());
    const notifier = { issues: vi.fn().mockResolvedValue(undefined), created: vi.fn() };

    const subscriber = new CreateFileOnTemporalFileUploaded(
      creator,
      new FileOverriderTestClass(),
      {} as Environment,
      'test-bucket',
      {
        run: vi.fn().mockRejectedValue(new Error('EACCES on the staging file')),
      } as unknown as DeleteTemporalFileIfUnchanged,
      notifier as unknown as SyncFileMessenger,
    );

    await expect(subscriber.on(event)).resolves.toBeUndefined();

    expect(creator.mock).toHaveBeenCalled();
    expect(notifier.issues).not.toHaveBeenCalled();
    expect(vi.mocked(uploadAndCreateThumbnail)).toHaveBeenCalled();
  });

  it('reaps a staged copy filed under a path that normalisation would change', async () => {
    // The reap moved from FileCreatedDomainEvent.path, which is
    // path.normalize(event.path) because FilePath's base class normalises, to
    // the raw event.path. That is only harmless if the repository canonicalises
    // on the way in, and this pins that it does: the staged copy is filed under
    // a redundant-separator path and reaped by the raw string.
    const rawPath = '/Private/notes//passwords.kdbx';
    expect(normalize(rawPath)).not.toBe(rawPath);

    const documentPath = new TemporalFilePath(rawPath);
    await repository.create(documentPath);
    const staged = (await repository.find(documentPath)).get();

    // The two keys resolve to the same entry, which is the whole reason the
    // move from the normalised path to the raw one is not a behaviour change.
    // Without this the test would pass under either hypothesis about where the
    // canonicalisation happens, and would settle nothing.
    const viaNormalised = (await repository.find(new TemporalFilePath(normalize(rawPath)))).get();
    expect(viaNormalised.contentFilePath).toBe(staged.contentFilePath);
    expect(viaNormalised.revision).toBe(staged.revision);

    creator.mock.mockResolvedValue(FileMother.noThumbnable());

    await bus.publish([
      new TemporalFileUploadedDomainEvent({
        aggregateId: '0000000000000000000000bb',
        size: staged.size.value,
        path: rawPath,
        contentFilePath: staged.contentFilePath,
        uploadedRevision: staged.revision,
      }),
    ]);

    await settled(async () => {
      expect((await repository.find(documentPath)).isPresent()).toBe(false);
    });
  });

  it('keeps the staged copy when the create fails, so the next release retries', async () => {
    const { documentPath, event } = await stageAndUpload();
    creator.mock.mockRejectedValue(new Error('the remote create failed'));

    await bus.publish([event]);

    await settled(async () => {
      expect(creator.mock).toHaveBeenCalled();
    });
    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });
});
