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
      uploadedModifiedTime: staged.modifiedTime,
    };
  }

  it('deletes the staged copy when it still holds exactly what was uploaded', async () => {
    const { documentPath, contentFilePath, uploadedModifiedTime } = await stage(PATH);

    await sut.run(PATH, uploadedModifiedTime);

    expect((await repository.find(documentPath)).isPresent()).toBe(false);
    expect(existsSync(contentFilePath)).toBe(false);
  });

  it('keeps a staged copy written again since the upload read it', async () => {
    const { documentPath, contentFilePath, uploadedModifiedTime } = await stage(PATH);

    await writeFile(contentFilePath, 'bytes written while the override was in flight');

    await sut.run(PATH, uploadedModifiedTime);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
    expect(existsSync(contentFilePath)).toBe(true);
  });

  it('keeps a staged copy written DURING the upload, whose mtime precedes the upload finishing', async () => {
    // The case a "modified after the upload finished" test cannot see: the write
    // lands while the stream is being read, so its mtime is older than the moment
    // the upload completed, yet its bytes may not be in the uploaded object.
    const { documentPath, contentFilePath } = await stage(PATH);

    await writeFile(contentFilePath, 'bytes written mid-stream');
    const uploadFinishedAt = new Date(Date.now() + 60_000);
    const revisionTheUploadRead = new Date(Date.now() - 60_000);

    await sut.run(PATH, revisionTheUploadRead);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
    expect(existsSync(contentFilePath)).toBe(true);
    expect(uploadFinishedAt.getTime()).toBeGreaterThan(revisionTheUploadRead.getTime());
  });

  it('keeps the staged copy when the uploaded revision is unknown', async () => {
    const { documentPath } = await stage(PATH);

    await sut.run(PATH, undefined);

    expect((await repository.find(documentPath)).isPresent()).toBe(true);
  });

  it('does nothing when no staged copy is filed under the path', async () => {
    await expect(sut.run('/Private/notes/never-staged.kdbx', new Date())).resolves.toBeUndefined();
  });

  it('leaves other staged copies alone', async () => {
    const { documentPath: overridden, uploadedModifiedTime } = await stage(PATH);
    const { documentPath: untouched } = await stage('/Private/notes/other.kdbx');

    await sut.run(PATH, uploadedModifiedTime);

    expect((await repository.find(overridden)).isPresent()).toBe(false);
    expect((await repository.find(untouched)).isPresent()).toBe(true);
  });
});
