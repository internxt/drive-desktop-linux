import { mockDeep } from 'vitest-mock-extended';
import { randomUUID } from 'node:crypto';
import { left, right } from '../../../../shared/domain/Either';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { FolderMother } from '../../domain/__test-helpers__/FolderMother';
import { FolderPersistedDto, RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { SimpleFolderCreator } from './SimpleFolderCreator';

describe('SimpleFolderCreator', () => {
  let remoteFileSystem: RemoteFileSystem;
  let simpleFolderCreator: SimpleFolderCreator;

  beforeEach(() => {
    remoteFileSystem = mockDeep<RemoteFileSystem>();
    simpleFolderCreator = new SimpleFolderCreator(remoteFileSystem);
  });

  it('retries when parent folder is not found and eventually succeeds', async () => {
    vi.useFakeTimers();

    const folderDto: FolderPersistedDto = {
      id: 321,
      uuid: randomUUID(),
      parentId: 123,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(remoteFileSystem.persist)
      .mockResolvedValueOnce(left(new DriveDesktopError('PARENT_FOLDER_NOT_FOUND')))
      .mockResolvedValueOnce(right(folderDto));

    const runPromise = simpleFolderCreator.run('/root/child', 123, 'parent-uuid');
    await vi.runAllTimersAsync();
    const folder = await runPromise;

    expect(folder.uuid).toBe(folderDto.uuid);
    expect(remoteFileSystem.persist).toHaveBeenCalledTimes(2);
    expect(remoteFileSystem.persist).toHaveBeenCalledWith('child', 'parent-uuid');

    vi.useRealTimers();
  });

  it('returns existing folder when remote reports FILE_ALREADY_EXISTS', async () => {
    const existingFolder = FolderMother.fromPartial({
      parentId: 123,
      path: '/root/child',
    });

    vi.mocked(remoteFileSystem.persist).mockResolvedValueOnce(left(new DriveDesktopError('FILE_ALREADY_EXISTS')));
    vi.mocked(remoteFileSystem.searchWith).mockResolvedValueOnce(existingFolder);

    const folder = await simpleFolderCreator.run('/root/child', 123, 'parent-uuid');

    expect(folder.uuid).toBe(existingFolder.uuid);
    expect(remoteFileSystem.searchWith).toHaveBeenCalledTimes(1);
  });
});