import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeTemporalFileRepository } from '../../infrastructure/NodeTemporalFileRepository';
import { TemporalFilePath } from '../../domain/TemporalFilePath';
import { TemporalFileByPathFinder } from '../find/TemporalFileByPathFinder';
import { TemporalFileDeleter } from './TemporalFileDeleter';
import { DeleteTemporalFileIfUnchanged } from './DeleteTemporalFileIfUnchanged';

const PATH = '/Private/notes/passwords.kdbx';

describe('DeleteTemporalFileIfUnchanged', () => {
  let folder: string;
  let repository: NodeTemporalFileRepository;
  let sut: DeleteTemporalFileIfUnchanged;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-temporal-files-'));
    repository = new NodeTemporalFileRepository(folder);
    repository.init();

    sut = new DeleteTemporalFileIfUnchanged(new TemporalFileByPathFinder(repository), new TemporalFileDeleter(repository));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  async function stage(path: string) {
    const documentPath = new TemporalFilePath(path);
    await repository.create(documentPath);
    const temporalFile = await repository.find(documentPath);

    return { documentPath, contentFilePath: temporalFile.get().contentFilePath as string };
  }

  it('deletes the staged copy once its contents have been uploaded', async () => {
    const { documentPath, contentFilePath } = await stage(PATH);

    await sut.run(PATH, new Date(Date.now() + 1000));

    expect((await repository.find(documentPath)).isPresent()).toBe(false);
    expect(existsSync(contentFilePath)).toBe(false);
  });

  it('keeps a staged copy written again since the upload, so the next release uploads it', async () => {
    const { documentPath, contentFilePath } = await stage(PATH);

    const uploadedAt = new Date(Date.now() - 1000);
    await writeFile(contentFilePath, 'bytes written while the override was in flight');

    await sut.run(PATH, uploadedAt);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
    expect(existsSync(contentFilePath)).toBe(true);
  });

  it('does nothing when no staged copy is filed under the path', async () => {
    await expect(sut.run('/Private/notes/never-staged.kdbx', new Date())).resolves.toBeUndefined();
  });

  it('leaves other staged copies alone', async () => {
    const { documentPath: overridden } = await stage(PATH);
    const { documentPath: untouched } = await stage('/Private/notes/other.kdbx');

    await sut.run(PATH, new Date(Date.now() + 1000));

    expect((await repository.find(overridden)).isPresent()).toBe(false);
    expect((await repository.find(untouched)).isPresent()).toBe(true);
  });
});
