import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { mockDeep } from 'vitest-mock-extended';
import { calls, partialSpyOn } from 'tests/vitest/utils.helper';
import { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import * as refresh from './refresh-children';
import { synchronizeChildrenIfStale } from './synchronize-children-if-stale';

describe('synchronize-children-if-stale', () => {
  const refreshMock = partialSpyOn(refresh, 'refreshChildren');
  const props = {
    folder: FolderMother.root(),
    folderRepository: mockDeep<FolderRepository>(),
    fileRepository: mockDeep<FileRepository>(),
  };

  it('should share concurrent refreshes and release them after success', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof refresh.refreshChildren>>>();
    refreshMock.mockReturnValue(pending.promise);
    const first = synchronizeChildrenIfStale(props);
    const second = synchronizeChildrenIfStale(props);
    calls(refreshMock).toHaveLength(1);
    pending.resolve(Result.ok(undefined));
    await Promise.all([first, second]);

    refreshMock.mockResolvedValue(Result.ok(undefined));
    await synchronizeChildrenIfStale(props);
    calls(refreshMock).toHaveLength(2);
  });

  it('should release failed refreshes so subsequent calls can retry', async () => {
    const error = new Error('refresh failed');
    refreshMock.mockResolvedValue(Result.err(error));
    await expect(synchronizeChildrenIfStale(props)).resolves.toMatchObject({ error });

    refreshMock.mockResolvedValue(Result.ok(undefined));
    await synchronizeChildrenIfStale(props);
    calls(refreshMock).toHaveLength(2);
  });

  it('should not refresh a virtual trash folder', async () => {
    refreshMock.mockClear();

    const result = await synchronizeChildrenIfStale({
      ...props,
      folder: FolderMother.fromPartial({ path: '/.Trash-1000' }),
    });

    expect(result).toStrictEqual({ data: undefined });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('should refresh different folders independently', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof refresh.refreshChildren>>>();
    refreshMock.mockReturnValue(pending.promise);
    const first = synchronizeChildrenIfStale(props);
    const second = synchronizeChildrenIfStale({
      ...props,
      folder: FolderMother.fromPartial({ id: 99, path: '/documents' }),
    });
    calls(refreshMock).toHaveLength(2);
    pending.resolve(Result.ok(undefined));
    await Promise.all([first, second]);
  });
});
