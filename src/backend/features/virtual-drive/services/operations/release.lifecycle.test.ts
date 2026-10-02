import { ContainerBuilder } from 'diod';
import { Environment } from '@internxt/inxt-js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { NodeTemporalFileRepository } from '../../../../../context/storage/TemporalFiles/infrastructure/NodeTemporalFileRepository';
import { TemporalFileRepository } from '../../../../../context/storage/TemporalFiles/domain/TemporalFileRepository';
import { TemporalFileUploaderFactory } from '../../../../../context/storage/TemporalFiles/domain/upload/TemporalFileUploaderFactory';
import { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { Replaces } from '../../../../../context/storage/TemporalFiles/domain/upload/Replaces';
import { TemporalFileCreator } from '../../../../../context/storage/TemporalFiles/application/creation/TemporalFileCreator';
import { TemporalFileWriter } from '../../../../../context/storage/TemporalFiles/application/write/TemporalFileWriter';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileDeleter } from '../../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { TemporalFileUploader } from '../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploader';
import { DeleteTemporalFileIfUnchanged } from '../../../../../context/storage/TemporalFiles/application/deletion/DeleteTemporalFileIfUnchanged';
import { EventBus } from '../../../../../context/virtual-drive/shared/domain/EventBus';
import { NodeJsEventBus } from '../../../../../context/virtual-drive/shared/infrastructure/NodeJsEventBus';
import { CreateFileOnTemporalFileUploaded } from '../../../../../context/virtual-drive/files/application/create/CreateFileOnTemporalFileUploaded';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { PendingModificationTimes } from '../../../../../context/virtual-drive/files/application/utimens/PendingModificationTimes';
import { FileCreatorTestClass } from '../../../../../context/virtual-drive/files/__test-helpers__/FileCreatorTestClass';
import { FileOverriderTestClass } from '../../../../../context/virtual-drive/files/__test-helpers__/FileOverriderTestClass';
import { FileMother } from '../../../../../context/virtual-drive/files/domain/__test-helpers__/FileMother';
import { release } from './release.service';

vi.mock('../../../usage/validate-space', () => ({
  validateSpace: vi.fn().mockResolvedValue({ data: { hasSpace: true } }),
}));

vi.mock('../../../../../apps/main/config', () => ({
  default: { get: vi.fn().mockReturnValue(undefined) },
}));

vi.mock('../../../user/file-size-limit/add-max-file-size-rejection', () => ({
  addMaxFileSizeRejection: vi.fn(),
  isUploadSizeLimitBlockedPath: vi.fn().mockReturnValue(false),
  clearUploadSizeLimitBlockedPath: vi.fn(),
}));

vi.mock('../../../../../apps/main/issues/virtual-drive', () => ({
  addVirtualDriveIssue: vi.fn(),
}));

const PATH = '/Private/notes/passwords.kdbx';
const EXISTING_CONTENTS_ID = '0000000000000000000000aa';

/**
 * The symptom, end to end: a close that follows a committed override must not
 * upload anything.
 *
 * Everything else on this branch pins a piece of the mechanism - the reaper
 * reaps, the counter moves, the event carries a revision. None of it asserts
 * what the user actually experienced, and release.service.ts, where the symptom
 * appears, is not exercised at all. That gap is the one a fix spanning a
 * container, an event bus and three layers can hide in: every unit correct, the
 * wiring not.
 *
 * Only the remote calls and the space check are doubled. The repository, the
 * uploader, the bus, the subscriber and the reaper are the production classes,
 * resolved from a real container.
 */
describe('a release after an override uploads nothing', () => {
  let folder: string;
  let container: Awaited<ReturnType<ContainerBuilder['build']>>;
  let uploads: number;
  let uploaded: Buffer[];
  let replacedIds: Array<string | undefined>;
  let overrider: FileOverriderTestClass;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-release-lifecycle-'));
    uploads = 0;
    uploaded = [];
    replacedIds = [];

    const repository = new NodeTemporalFileRepository(folder);
    repository.init();

    overrider = new FileOverriderTestClass();
    overrider.mock.mockResolvedValue(FileMother.noThumbnable());

    // Counts uploads and returns a contents id, so the only thing standing in
    // for the network is the network.
    // Each build() captures the state accumulated since the last one, so two
    // overlapping uploads cannot share a stream or a document. The builder is
    // otherwise faithful: it drains what it is given, as a real uploader does.
    // Abandoning the stream instead leaves an open() in flight that raises
    // ENOENT once the reap unlinks the staged copy, which is the double's
    // problem and not the code's.
    let staging: { readable?: Readable; document?: TemporalFile; replaces?: Replaces } = {};

    const uploaderFactory: TemporalFileUploaderFactory = {
      read(readable: Readable) {
        staging.readable = readable;
        return this;
      },
      document(document: TemporalFile) {
        staging.document = document;
        return this;
      },
      replaces(replaces?: Replaces) {
        staging.replaces = replaces;
        return this;
      },
      abort: () => uploaderFactory,
      build() {
        const captured = staging;
        staging = {};

        return async () => {
          if (captured.readable) {
            for await (const chunk of captured.readable) {
              uploaded.push(Buffer.from(chunk as Buffer));
            }
          }

          uploads += 1;
          replacedIds.push(captured.replaces?.contentsId);

          return '0000000000000000000000bb';
        };
      },
    } as unknown as TemporalFileUploaderFactory;

    const bus = new NodeJsEventBus();

    const builder = new ContainerBuilder();
    builder.register(TemporalFileRepository).useInstance(repository);
    builder.register(TemporalFileUploaderFactory).useInstance(uploaderFactory);
    builder.register(EventBus).useInstance(bus);
    builder.register(Environment).useInstance({} as Environment);
    builder.registerAndUse(TemporalFileCreator);
    builder.registerAndUse(TemporalFileWriter);
    builder.registerAndUse(TemporalFileByPathFinder);
    builder.registerAndUse(PendingModificationTimes);
    builder.registerAndUse(TemporalFileDeleter);
    builder.registerAndUse(DeleteTemporalFileIfUnchanged);
    builder.registerAndUse(TemporalFileUploader);

    // The release path asks for the file it is replacing. An existing file is
    // what puts this on the override branch, which is the branch that leaked.
    builder.register(FirstsFileSearcher).useInstance({
      run: vi.fn().mockResolvedValue({ contentsId: EXISTING_CONTENTS_ID, name: 'passwords', type: 'kdbx' }),
    } as unknown as FirstsFileSearcher);

    container = builder.build();

    bus.addSubscribers([
      new CreateFileOnTemporalFileUploaded(
        new FileCreatorTestClass(),
        overrider,
        {} as Environment,
        'test-bucket',
        container.get(DeleteTemporalFileIfUnchanged),
      ),
    ]);
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  /**
   * The bus publishes without awaiting its subscribers, so release() returns
   * while the override and the reap are still in flight. A release arriving in
   * that window legitimately uploads again; the claim under test is about the
   * settled state, not about the instant release() returns.
   */
  async function reapSettled() {
    // Deliberately does not assert. Waiting is a precondition of the claim, not
    // the claim: if the reap never happens, the interesting failure is that the
    // next close uploads again, and swallowing the timeout here is what lets the
    // test report that rather than reporting a stalled wait.
    await vi
      .waitFor(async () => expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeUndefined(), {
        timeout: 2000,
        interval: 10,
      })
      .catch(() => undefined);
  }

  async function stage(contents: string) {
    await container.get(TemporalFileCreator).run(PATH);
    await container.get(TemporalFileWriter).run(PATH, Buffer.from(contents), contents.length, 0);
  }

  it('uploads once for one round of writes, however many times the file is closed', async () => {
    await stage('the contents');

    const first = await release({ path: PATH, processName: 'test', container });
    expect(first.error).toBeUndefined();
    expect(uploads).toBe(1);

    // What was sent, not merely that something was. An upload that streamed
    // the wrong bytes or overrode the wrong file would satisfy a bare count.
    expect(Buffer.concat(uploaded).toString()).toBe('the contents');
    expect(replacedIds).toEqual([EXISTING_CONTENTS_ID]);

    await reapSettled();

    const second = await release({ path: PATH, processName: 'test', container });
    expect(second.error).toBeUndefined();

    // The whole bug: before the override branch reaped, the staged copy
    // survived and this second close re-uploaded the entire file.
    expect(uploads).toBe(1);
    expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeUndefined();

    const third = await release({ path: PATH, processName: 'test', container });
    expect(third.error).toBeUndefined();
    expect(uploads).toBe(1);
  });

  it('uploads again when the file is actually written between the two closes', async () => {
    await stage('the contents');

    await release({ path: PATH, processName: 'test', container });
    expect(uploads).toBe(1);

    await reapSettled();

    await stage('rewritten');

    await release({ path: PATH, processName: 'test', container });

    expect(uploads).toBe(2);
    expect(overrider.mock).toHaveBeenCalledTimes(2);

    // The second upload carries the new bytes, so the two builds did not share
    // a captured stream.
    expect(Buffer.concat(uploaded).toString()).toBe('the contentsrewritten');
  });

  it('keeps the staged copy for the next close when the override fails', async () => {
    await stage('the contents');
    overrider.mock.mockRejectedValue(new Error('the remote override failed'));

    await release({ path: PATH, processName: 'test', container });
    expect(uploads).toBe(1);

    await vi.waitFor(() => expect(overrider.mock).toHaveBeenCalled(), { timeout: 2000, interval: 10 });

    // Nothing reached the cloud, so the bytes must still be here to send.
    expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeDefined();
  });
});
