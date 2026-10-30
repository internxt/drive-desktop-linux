import { mockDeep } from 'vitest-mock-extended';
import { randomUUID } from 'node:crypto';
import { left, right } from '../../../../shared/domain/Either';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
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

    const parentUuid = randomUUID();
    const folderDto: FolderPersistedDto = {
      uuid: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(remoteFileSystem.persist)
      .mockResolvedValueOnce(left(new DriveDesktopError('PARENT_FOLDER_NOT_FOUND')))
      .mockResolvedValueOnce(right(folderDto));

    const runPromise = simpleFolderCreator.run('/root/child', parentUuid);
    await vi.runAllTimersAsync();
    const folder = await runPromise;

    expect(folder.uuid).toBe(folderDto.uuid);
    expect(remoteFileSystem.persist).toHaveBeenCalledTimes(2);
    expect(remoteFileSystem.persist).toHaveBeenCalledWith('child', parentUuid);

    vi.useRealTimers();
  });

  it('throws when remote reports FILE_ALREADY_EXISTS', async () => {
    const parentUuid = randomUUID();

    vi.mocked(remoteFileSystem.persist).mockResolvedValueOnce(left(new DriveDesktopError('FILE_ALREADY_EXISTS')));

    await expect(simpleFolderCreator.run('/root/child', parentUuid)).rejects.toThrow(
      'Could not create folder /root/child: FILE_ALREADY_EXISTS',
    );
  });
});
