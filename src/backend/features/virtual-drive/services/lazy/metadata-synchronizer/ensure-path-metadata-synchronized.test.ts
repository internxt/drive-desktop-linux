import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { mockDeep } from 'vitest-mock-extended';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import * as resolution from './resolve-folder';
import * as synchronization from './synchronize-children-if-stale';
import { ensurePathMetadataSynchronized } from './ensure-path-metadata-synchronized';

describe('ensure-path-metadata-synchronized', () => {
  const resolveMock = partialSpyOn(resolution, 'resolveFolder');
  const synchronizeMock = partialSpyOn(synchronization, 'synchronizeChildrenIfStale');
  const folder = FolderMother.root();
  const folderRepository = mockDeep<FolderRepository>();
  const fileRepository = mockDeep<FileRepository>();

  beforeEach(() => {
    resolveMock.mockResolvedValue(Result.ok(folder));
    synchronizeMock.mockResolvedValue(Result.ok(undefined));
  });

  it.each([
    { path: '/', parentPath: '/' },
    { path: 'documents/./report.txt', parentPath: '/documents' },
  ])('should resolve and synchronize the parent of $path', async ({ path, parentPath }) => {
    await ensurePathMetadataSynchronized({ path, folderRepository, fileRepository });

    call(resolveMock).toStrictEqual({ path: parentPath, folderRepository, fileRepository });
    call(synchronizeMock).toStrictEqual({ folder, folderRepository, fileRepository });
  });

  it('should propagate resolution errors without refreshing', async () => {
    const error = new Error('resolution failed');
    resolveMock.mockResolvedValue(Result.err(error));

    const result = await ensurePathMetadataSynchronized({ path: '/', folderRepository, fileRepository });

    expect(result.error).toBe(error);
    expect(synchronizeMock).not.toHaveBeenCalled();
  });

  it('should propagate refresh errors', async () => {
    const error = new Error('refresh failed');
    synchronizeMock.mockResolvedValue(Result.err(error));

    const result = await ensurePathMetadataSynchronized({ path: '/', folderRepository, fileRepository });

    expect(result.error).toBe(error);
  });
});
