import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeTemporalFileRepository } from './NodeTemporalFileRepository';

// Taking the length is the only step that can fail once the descriptor is open,
// and nothing about a real filesystem makes fstat fail on demand. The override
// replaces the handle's own stat so the close-on-failure path can be reached.
const { openOverride } = vi.hoisted(() => ({
  openOverride: { statFn: undefined as undefined | (() => never), closed: false },
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);

      if (!openOverride.statFn) {
        return handle;
      }

      return new Proxy(handle, {
        get(target, property, receiver) {
          if (property === 'stat') return openOverride.statFn;
          if (property === 'close') {
            return async () => {
              openOverride.closed = true;
              await target.close();
            };
          }

          return Reflect.get(target, property, receiver);
        },
      });
    },
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

    it('should bound the body to the declared length when the file grows underneath it', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);
      await repository.write(documentPath, Buffer.from('frozen'), 6, 0);

      const snapshot = await repository.createUploadSnapshot(documentPath);

      await repository.write(documentPath, Buffer.from(' and then very much longer'), 26, 6);

      // This is the bug the PR exists for: the length was declared as 6, so no
      // attempt may send the 32 bytes that are now on disk.
      expect(snapshot.size).toBe(6);
      await expect(readAll(snapshot.open())).resolves.toBe('frozen');

      await snapshot.dispose();
    });

    it('should let a retry read the same length again rather than resuming or failing', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);
      await repository.write(documentPath, Buffer.from('first'), 5, 0);

      const snapshot = await repository.createUploadSnapshot(documentPath);

      // Consuming a stream must neither advance a shared position nor close the
      // descriptor: `createReadStream` closes the handle it is given unless
      // autoClose is off, which would make this second attempt fail with EBADF.
      const first = await readAll(snapshot.open());
      const second = await readAll(snapshot.open());

      expect(first).toBe('first');
      expect(second).toBe(first);

      await snapshot.dispose();
    });

    it('should write nothing to the staging folder', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);
      const before = await readdir(folder);

      const snapshot = await repository.createUploadSnapshot(documentPath);

      // The point of reading through a descriptor: an upload of an 800 MB file
      // costs no second copy of it, so nothing here is left to reclaim either.
      expect(await readdir(folder)).toStrictEqual(before);

      await snapshot.dispose();

      expect(await readdir(folder)).toStrictEqual(before);
    });

    it('should send nothing for an empty file even after it stops being empty', async () => {
      const documentPath = new TemporalFilePath('/Documents/empty.kdbx');

      await repository.create(documentPath);

      const snapshot = await repository.createUploadSnapshot(documentPath);
      expect(snapshot.size).toBe(0);

      // The file must not stay empty, or this passes for the wrong reason. An
      // inclusive [0, 0] is ONE byte, so a zero-length declaration would send
      // one - the same over-send the class exists to prevent, reached through
      // the guard against createReadStream rejecting an end of -1.
      await repository.write(documentPath, Buffer.from('no longer empty'), 15, 0);

      await expect(readAll(snapshot.open())).resolves.toBe('');

      await snapshot.dispose();
    });

    it('should close the descriptor when taking the length fails', async () => {
      const documentPath = new TemporalFilePath('/Documents/database.kdbx');

      await repository.create(documentPath);

      openOverride.closed = false;
      openOverride.statFn = () => {
        throw new Error('fstat failed on an open descriptor');
      };

      try {
        await expect(repository.createUploadSnapshot(documentPath)).rejects.toThrow('fstat failed');
        expect(openOverride.closed).toBe(true);
      } finally {
        openOverride.statFn = undefined;
      }
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
