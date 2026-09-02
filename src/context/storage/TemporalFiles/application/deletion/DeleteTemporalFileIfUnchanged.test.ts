import { mkdtemp, rm } from 'node:fs/promises';
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

    sut = new DeleteTemporalFileIfUnchanged(
      new TemporalFileByPathFinder(repository),
      new TemporalFileDeleter(repository),
    );
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  /** Stages a copy and returns the revision an upload reading it now would carry. */
  async function stage(path: string) {
    const documentPath = new TemporalFilePath(path);
    await repository.create(documentPath);
    const staged = (await repository.find(documentPath)).get();

    return {
      documentPath,
      contentFilePath: staged.contentFilePath as string,
      uploadedRevision: staged.revision,
    };
  }

  it('deletes the staged copy when it still holds exactly what was uploaded', async () => {
    const { documentPath, contentFilePath, uploadedRevision } = await stage(PATH);

    await sut.run(PATH, uploadedRevision);

    expect((await repository.find(documentPath)).isPresent()).toBe(false);
    expect(existsSync(contentFilePath)).toBe(false);
  });

  it('keeps a staged copy written again since the upload read it', async () => {
    const { documentPath, uploadedRevision } = await stage(PATH);

    await repository.write(documentPath, Buffer.from('newer bytes'), 11, 0);

    await sut.run(PATH, uploadedRevision);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });

  it('keeps a staged copy edited in place with no change of length', async () => {
    // The case a size comparison cannot see and a quantised timestamp may not
    // see either: one byte flipped, same length, possibly the same millisecond.
    const documentPath = new TemporalFilePath(PATH);
    await repository.create(documentPath);
    await repository.write(documentPath, Buffer.from('AAAA'), 4, 0);
    const uploadedRevision = (await repository.find(documentPath)).get().revision;
    const sizeAtUpload = (await repository.find(documentPath)).get().size.value;

    await repository.write(documentPath, Buffer.from('B'), 1, 2);

    const after = (await repository.find(documentPath)).get();
    expect(after.size.value).toBe(sizeAtUpload); // the length did not move
    expect(after.revision).not.toBe(uploadedRevision); // the revision did

    await sut.run(PATH, uploadedRevision);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });

  it('keeps a staged copy that was truncated since the upload', async () => {
    const { documentPath, uploadedRevision } = await stage(PATH);

    await repository.truncate(documentPath, 0);

    await sut.run(PATH, uploadedRevision);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });

  it('never reuses a revision, so a fresh staged copy is not mistaken for an uploaded one', async () => {
    // Re-creating over the same path stages a NEW file. If revisions restarted
    // per path, the new copy would match the old upload's revision and be
    // deleted without ever having been uploaded.
    const documentPath = new TemporalFilePath(PATH);
    await repository.create(documentPath);
    const firstRevision = (await repository.find(documentPath)).get().revision;

    await repository.delete(documentPath);
    await repository.create(documentPath);
    const secondRevision = (await repository.find(documentPath)).get().revision;

    expect(secondRevision).not.toBe(firstRevision);

    await sut.run(PATH, firstRevision);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });

  it('keeps the staged copy when the uploaded revision is unknown', async () => {
    const { documentPath } = await stage(PATH);

    await sut.run(PATH, undefined);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });

  it('does nothing when no staged copy is filed under the path', async () => {
    await expect(sut.run('/Private/notes/never-staged.kdbx', 1)).resolves.toBeUndefined();
  });

  it('leaves other staged copies alone', async () => {
    const { documentPath: overridden, uploadedRevision } = await stage(PATH);
    const { documentPath: untouched } = await stage('/Private/notes/other.kdbx');

    await sut.run(PATH, uploadedRevision);

    expect((await repository.find(overridden)).isPresent()).toBe(false);
    expect((await repository.find(untouched)).isPresent()).toBe(true);
  });
});
