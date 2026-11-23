import { Either, left, right } from '../../../shared/domain/Either';
import { DriveDesktopError } from '../../../shared/domain/errors/DriveDesktopError';
import { Folder } from '../domain/Folder';
import { FolderPath } from '../domain/FolderPath';
import { FolderPersistedDto, RemoteFileSystem } from '../domain/file-systems/RemoteFileSystem';

export class FolderRemoteFileSystemMock implements RemoteFileSystem {
  readonly persistMock = vi.fn();
  private readonly searchWithMock = vi.fn();
  private readonly trashMock = vi.fn();
  private readonly moveMock = vi.fn();
  private readonly renameMock = vi.fn();

  searchWith(parentFolderUuid: string, folderPath: FolderPath): Promise<Folder | undefined> {
    return this.searchWithMock(parentFolderUuid, folderPath);
  }

  persist(plainName: string, parentFolderUuid: string): Promise<Either<DriveDesktopError, FolderPersistedDto>> {
    return this.persistMock(plainName, parentFolderUuid);
  }

  shouldPersists(folder: Folder, includeUuid: boolean) {
    const plainName = folder.name;
    const parentFolderUuid = includeUuid ? (folder.parentUuid ?? folder.uuid) : undefined;

    this.persistMock.mockResolvedValueOnce(
      right({
        uuid: folder.uuid,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      } satisfies FolderPersistedDto),
    );

    void plainName;
    void parentFolderUuid;
  }

  shouldFailPersistWith(_plainName: string, _parentFolderUuid: string, error: DriveDesktopError) {
    this.persistMock.mockResolvedValueOnce(left(error));
  }

  shouldFindFolder(folder?: Folder) {
    this.searchWithMock.mockResolvedValueOnce(folder);
  }

  shouldTrash(folder: Folder, error?: Error) {
    this.trashMock(folder.uuid);

    if (error) {
      this.trashMock.mockRejectedValueOnce(error);
      return;
    }

    this.trashMock.mockReturnValue(Promise.resolve());
  }

  shouldRename(folder: Folder, error?: Error) {
    this.renameMock(folder);

    if (error) {
      this.renameMock.mockRejectedValueOnce(error);
      return;
    }

    this.renameMock.mockReturnValueOnce(Promise.resolve());
  }

  shouldMove(error?: Error) {
    if (error) {
      this.moveMock.mockRejectedValueOnce(error);
      return;
    }

    this.moveMock.mockReturnValueOnce(Promise.resolve());
  }
}
