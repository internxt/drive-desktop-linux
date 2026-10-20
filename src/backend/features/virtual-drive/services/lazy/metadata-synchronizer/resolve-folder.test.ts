import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { mockDeep } from 'vitest-mock-extended';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import * as synchronization from './synchronize-children-if-stale';
import { resolveFolder } from './resolve-folder';

describe('resolve-folder', () => {
  const synchronizeMock = partialSpyOn(synchronization, 'synchronizeChildrenIfStale');
  const folderRepository = mockDeep<FolderRepository>();
  const fileRepository = mockDeep<FileRepository>();
  const root = FolderMother.root();
  const child = FolderMother.fromPartial({ id: 99, parentId: root.id, path: '/documents' });

  beforeEach(() => {
    folderRepository.matchingPartial.mockImplementation(({ path }) => (path === '/' ? [root] : []));
    synchronizeMock.mockResolvedValue(Result.ok(undefined));
  });

  it('should return the root without refreshing', async () => {
    expect(await resolveFolder({ path: '/', folderRepository, fileRepository })).toStrictEqual({ data: root });
    expect(synchronizeMock).not.toHaveBeenCalled();
  });

  it('should resolve cached normalized paths without refreshing', async () => {
    folderRepository.matchingPartial.mockImplementation(({ path }) => (path === '/' ? [root] : [child]));

    expect(await resolveFolder({ path: 'documents/.', folderRepository, fileRepository })).toStrictEqual({
      data: child,
    });
    expect(synchronizeMock).not.toHaveBeenCalled();
  });

  it('should hydrate a missing folder from its parent', async () => {
    synchronizeMock.mockImplementation(async () => {
      folderRepository.matchingPartial.mockImplementation(({ path }) => (path === '/' ? [root] : [child]));
      return Result.ok(undefined);
    });

    expect(await resolveFolder({ path: '/documents', folderRepository, fileRepository })).toStrictEqual({
      data: child,
    });
    call(synchronizeMock).toStrictEqual({ folder: root, folderRepository, fileRepository });
  });

  it('should return EIO when the root is missing', async () => {
    folderRepository.matchingPartial.mockReturnValue([]);

    const result = await resolveFolder({ path: '/', folderRepository, fileRepository });

    expect(result.error).toMatchObject({
      code: FuseCodes.EIO,
    });
    expect(synchronizeMock).not.toHaveBeenCalled();
  });

  it('should return ENOENT when hydration does not find the folder', async () => {
    const result = await resolveFolder({ path: '/missing', folderRepository, fileRepository });

    expect(result.error).toMatchObject({
      code: FuseCodes.ENOENT,
    });
  });

  it('should propagate hydration failures', async () => {
    const error = new Error('refresh failed');
    synchronizeMock.mockResolvedValue(Result.err(error));

    const result = await resolveFolder({ path: '/missing', folderRepository, fileRepository });

    expect(result.error).toBe(error);
  });
});
