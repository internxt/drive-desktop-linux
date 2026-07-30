import { right, left } from '../../../../shared/domain/Either';
import { Folder } from '../../domain/Folder';
import { FolderCreatedAt } from '../../domain/FolderCreatedAt';
import { FolderId } from '../../domain/FolderId';
import { FolderPath } from '../../domain/FolderPath';
import { FolderUpdatedAt } from '../../domain/FolderUpdatedAt';
import { FolderUuid } from '../../domain/FolderUuid';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { SimpleFolderCreator } from './SimpleFolderCreator';
import { loggerMock } from 'tests/vitest/mocks.helper';

describe('SimpleFolderCreator', () => {
  const persistMock = vi.fn();
  const searchWithMock = vi.fn();

  let remoteFileSystem: RemoteFileSystem;
  let sut: SimpleFolderCreator;

  beforeEach(() => {

    remoteFileSystem = {
      persist: persistMock,
      searchWith: searchWithMock,
    } as unknown as RemoteFileSystem;

    sut = new SimpleFolderCreator(remoteFileSystem);
  });

  it('creates a folder when remote persistence succeeds', async () => {
    const persistedFolder = {
      id: 7,
      uuid: '123e4567-e89b-12d3-a456-426614174000',
      parentId: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    persistMock.mockResolvedValue(right(persistedFolder));

    const folder = await sut.run('/photos', 1, 'parent-uuid');

    expect(persistMock).toHaveBeenCalledWith('photos', 'parent-uuid');
    expect(folder).toBeInstanceOf(Folder);
    expect(folder.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(folder.path).toBe('/photos');
    expect(folder.parentId).toBe(1);
    expect(folder.name).toBe('photos');
  });

  it('searches for the existing folder when remote persistence reports FILE_ALREADY_EXISTS', async () => {
    const existingFolder = Folder.create(
      new FolderId(9),
      new FolderUuid('123e4567-e89b-12d3-a456-426614174001'),
      new FolderPath('/photos'),
      new FolderId(1),
      FolderCreatedAt.fromString('2024-01-01T00:00:00.000Z'),
      FolderUpdatedAt.fromString('2024-01-02T00:00:00.000Z'),
    );

    persistMock.mockResolvedValue(left({ cause: 'FILE_ALREADY_EXISTS' }));
    searchWithMock.mockResolvedValue(existingFolder);

    const folder = await sut.run('/photos', 1, 'parent-uuid');

    expect(searchWithMock).toHaveBeenCalledWith(new FolderId(1), new FolderPath('/photos'));
    expect(folder).toBe(existingFolder);
  });

  it('logs a warning and throws when persistence fails with a non-recoverable error', async () => {
    persistMock.mockResolvedValue(left({ cause: 'NETWORK_ERROR' }));
    searchWithMock.mockResolvedValue(undefined);

    await expect(sut.run('/photos', 1, 'parent-uuid')).rejects.toThrow('Could not create folder and was not found either');

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'The folder was not been able to create',
      }),
    );
    expect(searchWithMock).not.toHaveBeenCalled();
  });
});
