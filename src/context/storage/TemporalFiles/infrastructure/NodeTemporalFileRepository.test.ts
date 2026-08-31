import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { NodeTemporalFileRepository } from './NodeTemporalFileRepository';

// `stat` is the only step that can fail AFTER the copy has created its
// destination, and nothing about a real filesystem makes it fail on demand.
const { statOverride } = vi.hoisted(() => ({ statOverride: { fn: undefined as undefined | (() => never) } }));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    stat: (...args: Parameters<typeof actual.stat>) => (statOverride.fn ? statOverride.fn() : actual.stat(...args)),
  };
});
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

  it('should return empty when mapped file no longer exists on disk', async () => {
    const documentPath = new TemporalFilePath('/Documents/.test-file.txt.swp');

    await repository.create(documentPath);
    const temporalFile = await repository.find(documentPath);
    const contentFilePath = temporalFile.get().contentFilePath;

    await rm(contentFilePath, { force: true });

    const result = await repository.find(documentPath);

    expect(result.isPresent()).toBe(false);
  });

  describe('createUploadSnapshot', () => {
    async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
      const chunks: Array<Buffer> = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks).toString();
    }

    it('should keep size and contents frozen while the backing file keeps changing', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);
      await repository.write(documentPath, Buffer.from('frozen'), 6, 0);

      const snapshot = await repository.createUploadSnapshot(documentPath);

      await repository.write(documentPath, Buffer.from('rewritten and longer'), 20, 0);

      expect(snapshot.size).toBe(6);
      await expect(readAll(snapshot.open())).resolves.toBe('frozen');

      await snapshot.dispose();
    });

    it('should give every reader of the snapshot the same bytes', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);
      await repository.write(documentPath, Buffer.from('first'), 5, 0);

      const snapshot = await repository.createUploadSnapshot(documentPath);

      const first = await readAll(snapshot.open());
      await repository.write(documentPath, Buffer.from('third'), 5, 0);
      const second = await readAll(snapshot.open());

      expect(second).toBe(first);

      await snapshot.dispose();
    });

    it('should leave nothing behind once disposed', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);
      const before = await readdir(folder);

      const snapshot = await repository.createUploadSnapshot(documentPath);
      expect(await readdir(folder)).toHaveLength(before.length + 1);

      await snapshot.dispose();

      expect(await readdir(folder)).toStrictEqual(before);
    });

    it('should leave no half-made snapshot behind when creating one fails', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);
      const before = await readdir(folder);

      statOverride.fn = () => {
        throw new Error('stat failed after the copy had already been made');
      };

      try {
        await expect(repository.createUploadSnapshot(documentPath)).rejects.toThrow('stat failed');
      } finally {
        statOverride.fn = undefined;
      }

      expect(await readdir(folder)).toStrictEqual(before);
    });

    it('should remove snapshots left behind by a previous run on init', async () => {
      const stale = join(folder, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.upload-snapshot');
      const mapped = join(folder, 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff');

      await writeFile(stale, 'a snapshot a killed process never disposed of');
      await writeFile(mapped, 'a mapped temporal file, which must survive');

      new NodeTemporalFileRepository(folder).init();

      await vi.waitFor(async () => expect(await readdir(folder)).toStrictEqual([basename(mapped)]));
    });

    it('should reject a document it has no mapping for', async () => {
      const documentPath = new TemporalFilePath('/Documents/never-created.kdbx');

      await expect(repository.createUploadSnapshot(documentPath)).rejects.toThrow(
        'Document with path /Documents/never-created.kdbx not found',
      );
    });
  });

  it('should ignore ENOENT when deleting a stale mapped file', async () => {
    const documentPath = new TemporalFilePath('/Documents/.test-file.txt.swp');

    await repository.create(documentPath);
    const temporalFile = await repository.find(documentPath);
    const contentFilePath = temporalFile.get().contentFilePath;

    await rm(contentFilePath, { force: true });

    await expect(repository.delete(documentPath)).resolves.toBeUndefined();
  });
});
