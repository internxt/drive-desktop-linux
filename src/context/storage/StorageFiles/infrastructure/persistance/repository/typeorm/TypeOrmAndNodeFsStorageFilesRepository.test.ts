import 'reflect-metadata';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { TypeOrmAndNodeFsStorageFilesRepository } from './TypeOrmAndNodeFsStorageFilesRepository';

describe('TypeOrmAndNodeFsStorageFilesRepository', () => {
  let baseFolder: string;
  let db: {
    find: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let repository: TypeOrmAndNodeFsStorageFilesRepository;

  beforeEach(async () => {
    baseFolder = await mkdtemp(path.join(os.tmpdir(), 'storage-files-repository-'));
    db = {
      find: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const dataSource = {
      getRepository: vi.fn().mockReturnValue(db),
    } as unknown as DataSource;

    repository = new TypeOrmAndNodeFsStorageFilesRepository(baseFolder, dataSource);
  });

  afterEach(async () => {
    await rm(baseFolder, { recursive: true, force: true });
  });

  it('deletes orphaned files from the storage folder when deleting all', async () => {
    await writeFile(path.join(baseFolder, 'orphaned-contents-id'), 'partial hydration');

    await repository.deleteAll();

    await expect(readdir(baseFolder)).resolves.toEqual([]);
  });

  it('deletes registered files and any remaining orphaned files from the storage folder', async () => {
    db.find.mockResolvedValue([{ id: 'registeredcontentsid0000' }]);
    await writeFile(path.join(baseFolder, 'registeredcontentsid0000'), 'hydrated file');
    await writeFile(path.join(baseFolder, 'orphaned-contents-id'), 'partial hydration');
    await mkdir(path.join(baseFolder, 'nested-directory'));

    await repository.deleteAll();

    expect(db.delete).toHaveBeenCalledWith({ id: 'registeredcontentsid0000' });
    await expect(readdir(baseFolder)).resolves.toEqual(['nested-directory']);
  });
});
