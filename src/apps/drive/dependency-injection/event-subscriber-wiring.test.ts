import { ContainerBuilder, Container } from 'diod';
import { Environment } from '@internxt/inxt-js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DomainEvent } from '../../../context/shared/domain/DomainEvent';
import { DomainEventSubscriber } from '../../../context/shared/domain/DomainEventSubscriber';
import { SubscribeDomainEventsHandlerToTheirEvents } from '../../../context/shared/infrastructure/domain-events/SubscribeDomainEventsHandlerToTheirEvents';
import { EventBus } from '../../../context/virtual-drive/shared/domain/EventBus';
import { NodeJsEventBus } from '../../../context/virtual-drive/shared/infrastructure/NodeJsEventBus';
import { CreateFileOnTemporalFileUploaded } from '../../../context/virtual-drive/files/application/create/CreateFileOnTemporalFileUploaded';
import { TemporalFileUploadedDomainEvent } from '../../../context/storage/TemporalFiles/domain/upload/TemporalFileUploadedDomainEvent';
import { TemporalFileRepository } from '../../../context/storage/TemporalFiles/domain/TemporalFileRepository';
import { TemporalFileCreator } from '../../../context/storage/TemporalFiles/application/creation/TemporalFileCreator';
import { TemporalFileByPathFinder } from '../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { FileOverrider } from '../../../context/virtual-drive/files/application/override/FileOverrider';
import { FileCreator } from '../../../context/virtual-drive/files/application/create/FileCreator';
import { TemporalFileWriter } from '../../../context/storage/TemporalFiles/application/write/TemporalFileWriter';
import { UploadProgressTracker } from '../../../context/shared/domain/UploadProgressTracker';
import { DownloadProgressTracker } from '../../../context/shared/domain/DownloadProgressTracker';
import { DownloaderHandlerFactory } from '../../../context/storage/StorageFiles/domain/download/DownloaderHandlerFactory';
import { AllParentFoldersStatusIsExists } from '../../../context/virtual-drive/folders/application/AllParentFoldersStatusIsExists';
import { ParentFolderFinder } from '../../../context/virtual-drive/folders/application/ParentFolderFinder';
import { SingleFolderMatchingFinder } from '../../../context/virtual-drive/folders/application/SingleFolderMatchingFinder';
import { FileMother } from '../../../context/virtual-drive/files/domain/__test-helpers__/FileMother';

let folder: string;

vi.mock('../../../core/electron/paths', () => ({
  PATHS: {
    get INTERNXT_DRIVE_TMP() {
      return folder;
    },
  },
}));

vi.mock('../../shared/dependency-injection/DependencyInjectionUserProvider', () => ({
  DependencyInjectionUserProvider: {
    get: () => ({ bucket: 'test-bucket', backupsBucket: 'test-backups-bucket' }),
  },
}));

const PATH = '/Private/notes/passwords.kdbx';

/**
 * The reaping only runs in production if the subscriber that performs it is
 * tagged, resolvable, and actually subscribed to the bus that the uploader
 * publishes on. Nothing checked that.
 *
 * A container test that resolves the subscriber by hand cannot see a missing
 * tag, and a lifecycle test that constructs it by hand cannot either: both stay
 * green while production never reaps anything and the repeated-upload bug is
 * still live.
 *
 * This mirrors DriveDependencyContainerFactory.addEventSubscribers exactly -
 * find by tag, resolve, hand to SubscribeDomainEventsHandlerToTheirEvents - and
 * then publishes a real event to prove the wiring carries it.
 */
describe('the reaping subscriber is wired by the composition root', () => {
  let container: Container;
  let bus: NodeJsEventBus;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-wiring-'));

    const { registerTemporalFilesServices } = await import('./offline-drive/registerTemporalFilesServices');
    const { registerFilesServices } = await import('./virtual-drive/registerFilesServices');

    bus = new NodeJsEventBus();

    const builder = new ContainerBuilder();
    builder.register(EventBus).useInstance(bus);
    builder.register(Environment).useInstance({} as Environment);
    builder.register(UploadProgressTracker).useInstance({} as UploadProgressTracker);
    builder.register(DownloadProgressTracker).useInstance({} as DownloadProgressTracker);
    builder.register(DownloaderHandlerFactory).useInstance({} as DownloaderHandlerFactory);
    builder.register(AllParentFoldersStatusIsExists).useInstance({} as AllParentFoldersStatusIsExists);
    builder.register(ParentFolderFinder).useInstance({} as ParentFolderFinder);
    builder.register(SingleFolderMatchingFinder).useInstance({} as SingleFolderMatchingFinder);
    builder.registerAndUse(SubscribeDomainEventsHandlerToTheirEvents);

    await registerTemporalFilesServices(builder);
    await registerFilesServices(builder);

    container = builder.build();

    // Verbatim the composition root's own steps.
    const subscribers = container
      .findTaggedServiceIdentifiers<DomainEventSubscriber<DomainEvent>>('event-handler')
      .map((identifier) => container.get(identifier));

    container.get(SubscribeDomainEventsHandlerToTheirEvents).run(subscribers);
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('tags the reaping subscriber as an event handler', () => {
    const subscribers = container
      .findTaggedServiceIdentifiers<DomainEventSubscriber<DomainEvent>>('event-handler')
      .map((identifier) => container.get(identifier));

    expect(subscribers.some((subscriber) => subscriber instanceof CreateFileOnTemporalFileUploaded)).toBe(true);
  });

  it('reaps a staged copy when an override event reaches the wired bus', async () => {
    // On the prototype, not on a resolved instance: FileOverrider is transient
    // here, so the subscriber holds a different object than container.get()
    // returns and an instance spy would never be the one that runs.
    vi.spyOn(FileOverrider.prototype, 'run').mockResolvedValue(FileMother.noThumbnable());

    await container.get(TemporalFileCreator).run(PATH);
    const staged = await container.get(TemporalFileByPathFinder).run(PATH);
    expect(staged).toBeDefined();

    await bus.publish([
      new TemporalFileUploadedDomainEvent({
        aggregateId: '0000000000000000000000bb',
        size: staged?.size.value ?? 0,
        path: PATH,
        replaces: '0000000000000000000000aa',
        contentFilePath: staged?.contentFilePath,
        uploadedRevision: staged?.revision,
      }),
    ]);

    // The bus does not await subscribers, so this is the settled state.
    await vi.waitFor(async () => expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeUndefined(), {
      timeout: 2000,
      interval: 10,
    });

    // And the reaper it was given shares the repository the write path used,
    // which is what makes the revision comparison meaningful at all.
    expect(container.get(TemporalFileRepository)).toBe(container.get(TemporalFileRepository));
  });

  it('reaps a staged copy when a create event reaches the wired bus', async () => {
    vi.spyOn(FileCreator.prototype, 'run').mockResolvedValue(FileMother.noThumbnable());

    await container.get(TemporalFileCreator).run(PATH);
    const staged = await container.get(TemporalFileByPathFinder).run(PATH);
    expect(staged).toBeDefined();

    await bus.publish([
      new TemporalFileUploadedDomainEvent({
        aggregateId: '0000000000000000000000bb',
        size: staged?.size.value ?? 0,
        path: PATH,
        contentFilePath: staged?.contentFilePath,
        uploadedRevision: staged?.revision,
      }),
    ]);

    await vi.waitFor(async () => expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeUndefined(), {
      timeout: 2000,
      interval: 10,
    });
  });

  it('keeps a staged copy written after a create upload read it', async () => {
    // The composition root no longer wires a subscriber that deletes on
    // FileCreatedDomainEvent, so this is the whole of the create-path reaping:
    // if the guard were not wired, nothing would keep these bytes.
    vi.spyOn(FileCreator.prototype, 'run').mockResolvedValue(FileMother.noThumbnable());

    await container.get(TemporalFileCreator).run(PATH);
    const staged = await container.get(TemporalFileByPathFinder).run(PATH);
    const revisionTheUploadRead = staged?.revision;

    await container.get(TemporalFileWriter).run(PATH, Buffer.from('a later write'), 13, 0);

    await bus.publish([
      new TemporalFileUploadedDomainEvent({
        aggregateId: '0000000000000000000000bb',
        size: staged?.size.value ?? 0,
        path: PATH,
        contentFilePath: staged?.contentFilePath,
        uploadedRevision: revisionTheUploadRead,
      }),
    ]);

    await vi.waitFor(() => expect(FileCreator.prototype.run).toHaveBeenCalled(), { timeout: 2000, interval: 10 });

    expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeDefined();
  });
});
