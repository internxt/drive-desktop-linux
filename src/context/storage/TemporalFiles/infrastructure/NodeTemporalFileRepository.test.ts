import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeTemporalFileRepository } from './NodeTemporalFileRepository';
import { TemporalFilePath } from '../domain/TemporalFilePath';

describe('NodeTemporalFileRepository', () => {
  let folder: string;
  let repository: NodeTemporalFileRepository;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-temporal-files-'));
    repository = new NodeTemporalFileRepository(folder);
    repository.init();
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('should create a file and report it as existing', async () => {
    const documentPath = new TemporalFilePath('/Documents/.test-file.txt.swp');

    await repository.create(documentPath);

    await expect(repository.exits(documentPath)).resolves.toBe(true);
    await expect(repository.read(documentPath)).resolves.toEqual(Buffer.alloc(0));
  });

  it('should return empty when mapped file no longer exists on disk', async () => {
    const documentPath = new TemporalFilePath('/Documents/.test-file.txt.swp');

    await repository.create(documentPath);
    const temporalFile = await repository.find(documentPath);
    const contentFilePath = temporalFile.get().contentFilePath;

    await rm(contentFilePath, { force: true });

    const result = await repository.find(documentPath);

    expect(result.isPresent()).toBe(false);
  });

  it('should ignore ENOENT when deleting a stale mapped file', async () => {
    const documentPath = new TemporalFilePath('/Documents/.test-file.txt.swp');

    await repository.create(documentPath);
    const temporalFile = await repository.find(documentPath);
    const contentFilePath = temporalFile.get().contentFilePath;

    await rm(contentFilePath, { force: true });

    await expect(repository.delete(documentPath)).resolves.toBeUndefined();
  });

  it('should find temporal files belonging to the given directory', async () => {
    const firstPath = new TemporalFilePath('/Documents/file-one.txt');
    const secondPath = new TemporalFilePath('/Documents/file-two.txt');
    const otherPath = new TemporalFilePath('/Downloads/file-three.txt');

    await repository.create(firstPath);
    await repository.create(secondPath);
    await repository.create(otherPath);

    const result = await repository.matchingDirectory('/Documents');

    expect(result).toHaveLength(2);
    expect(result.map((path) => path.value)).toEqual(
      expect.arrayContaining(['/Documents/file-one.txt', '/Documents/file-two.txt']),
    );
  });
});
