import { Environment } from '@internxt/inxt-js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
      new DeleteTemporalFileIfUnchanged(new TemporalFileByPathFinder(repository), new TemporalFileDeleter(repository)),
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
        uploadedModifiedTime: staged.modifiedTime,
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
    // The write lands after the upload read the file but before the upload
    // finishes, so its modification time is EARLIER than the event's own
    // occurredOn. A guard that asks "was it modified after the upload finished"
    // answers no and deletes bytes that may never have been uploaded.
    const documentPath = new TemporalFilePath(PATH);
    await repository.create(documentPath);
    const staged = (await repository.find(documentPath)).get();
    const revisionTheUploadRead = staged.modifiedTime;
    const contentFilePath = staged.contentFilePath as string;

    await writeFile(contentFilePath, 'bytes written while the upload was streaming');
    const revisionNow = (await repository.find(documentPath)).get().modifiedTime;

    // guard the test's own premise: the write must have moved the mtime at all
    expect(revisionNow.getTime()).not.toBe(revisionTheUploadRead.getTime());

    const event = new TemporalFileUploadedDomainEvent({
      aggregateId: '0000000000000000000000bb',
      size: staged.size.value,
      path: PATH,
      replaces: '0000000000000000000000aa',
      contentFilePath,
      uploadedModifiedTime: revisionTheUploadRead,
    });
    // the event is built after the write, so occurredOn is LATER than the write
    expect(event.occurredOn!.getTime()).toBeGreaterThanOrEqual(revisionNow.getTime());

    overrider.mock.mockResolvedValue(FileMother.noThumbnable());

    await bus.publish([event]);

    await settled(async () => {
      expect(overrider.mock).toHaveBeenCalled();
    });
    expect((await repository.find(documentPath)).isPresent()).toBe(true);
    expect(existsSync(contentFilePath)).toBe(true);
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
