import { ContainerBuilder } from 'diod';
import { Environment } from '@internxt/inxt-js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { UploadProgressTracker } from '../../../../context/shared/domain/UploadProgressTracker';
import { EventBus } from '../../../../context/virtual-drive/shared/domain/EventBus';
import { TemporalFileRepository } from '../../../../context/storage/TemporalFiles/domain/TemporalFileRepository';
import { TemporalFileCreator } from '../../../../context/storage/TemporalFiles/application/creation/TemporalFileCreator';
import { TemporalFileWriter } from '../../../../context/storage/TemporalFiles/application/write/TemporalFileWriter';
import { TemporalFileByPathFinder } from '../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { DeleteTemporalFileIfUnchanged } from '../../../../context/storage/TemporalFiles/application/deletion/DeleteTemporalFileIfUnchanged';

let folder: string;

vi.mock('../../../../core/electron/paths', () => ({
  PATHS: {
    get INTERNXT_DRIVE_TMP() {
      return folder;
    },
  },
}));

vi.mock('../../../shared/dependency-injection/DependencyInjectionUserProvider', () => ({
  DependencyInjectionUserProvider: {
    get: () => ({ bucket: 'test-bucket' }),
  },
}));

const PATH = '/Private/notes/passwords.kdbx';

/**
 * The reaper only works if it shares one repository with the write path.
 *
 * NodeTemporalFileRepository keeps its path map and its revision counter in
 * instance memory, so two instances share nothing: a second one would not know
 * the path exists at all. The fix for the override leak depends on the reaper
 * reading a revision the FUSE write path wrote, and until now that sharing was
 * only ever checked by reading the registrations. If it broke, every unit test
 * would stay green while the fix did nothing in production.
 *
 * This resolves the real registrations and asserts the sharing through
 * behaviour rather than through instance identity, because behaviour is what
 * the fix depends on.
 */
describe('registerTemporalFilesServices wires one repository', () => {
  let container: Awaited<ReturnType<ContainerBuilder['build']>>;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-container-'));

    const { registerTemporalFilesServices } = await import('./registerTemporalFilesServices');

    const builder = new ContainerBuilder();

    // Registered here because they come from other modules in production. The
    // temporal-file registrations under test are the real ones.
    builder.register(Environment).useInstance({} as Environment);
    builder.register(UploadProgressTracker).useInstance({} as UploadProgressTracker);
    builder.register(EventBus).useInstance({ publish: vi.fn() } as unknown as EventBus);

    await registerTemporalFilesServices(builder);

    container = builder.build();
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('resolves the repository as a singleton', () => {
    expect(container.get(TemporalFileRepository)).toBe(container.get(TemporalFileRepository));
  });

  it('lets the reaper see a staged copy the write path created', async () => {
    await container.get(TemporalFileCreator).run(PATH);

    const staged = await container.get(TemporalFileByPathFinder).run(PATH);

    expect(staged).toBeDefined();
  });

  it('reaps a staged copy at the revision the write path last wrote', async () => {
    await container.get(TemporalFileCreator).run(PATH);
    await container.get(TemporalFileWriter).run(PATH, Buffer.from('contents'), 8, 0);

    const staged = await container.get(TemporalFileByPathFinder).run(PATH);
    expect(staged?.revision).toBeDefined();

    // The revision below was produced by the write path. A reaper holding a
    // different repository could not match it, because it would not find the
    // file in the first place.
    await container.get(DeleteTemporalFileIfUnchanged).run(PATH, staged?.revision);

    expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeUndefined();
  });

  it('keeps a staged copy the write path changed after that revision', async () => {
    await container.get(TemporalFileCreator).run(PATH);

    const uploaded = await container.get(TemporalFileByPathFinder).run(PATH);

    await container.get(TemporalFileWriter).run(PATH, Buffer.from('later bytes'), 11, 0);

    await container.get(DeleteTemporalFileIfUnchanged).run(PATH, uploaded?.revision);

    expect(await container.get(TemporalFileByPathFinder).run(PATH)).toBeDefined();
  });
});
