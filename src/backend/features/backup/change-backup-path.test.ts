import * as renameFolderModule from '../../../infra/drive-server/services/folder/services/rename-folder';
import * as migrateBackupEntryIfNeededModule from './migrate-backup-entry-if-needed';
import configStoreModule from '../../../apps/main/config';
import { changeBackupPath } from './change-backup-path';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { createAbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';

describe('change-backup-path', () => {
  const mockedConfigStoreGet = partialSpyOn(configStoreModule, 'get');
  const mockedConfigStoreSet = partialSpyOn(configStoreModule, 'set');
  const mockedRenameFolder = partialSpyOn(renameFolderModule, 'renameFolder');
  const mockedMigrateBackupEntryIfNeeded = partialSpyOn(migrateBackupEntryIfNeededModule, 'migrateBackupEntryIfNeeded');

  const currentPath = createAbsolutePath('/home/dev/Documents/current-backup');
  const newPath = createAbsolutePath('/home/dev/Documents/new-backup');

  it('should return error when backup no longer exists', async () => {
    mockedConfigStoreGet.mockReturnValue({});

    const result = await changeBackupPath({ currentPath, newPath });

    expect(result).toMatchObject({ error: new Error('No backup found with the provided path') });
  });

  it('should return error when new path already exists as backup', async () => {
    const existingBackup = { folderId: 12, folderUuid: 'folder-uuid', enabled: true };

    mockedConfigStoreGet.mockReturnValue({
      [currentPath]: existingBackup,
      [newPath]: { folderId: 99, folderUuid: 'another-folder-uuid', enabled: true },
    });

    const result = await changeBackupPath({ currentPath, newPath });

    expect(result).toMatchObject({ error: new Error('A backup with this path already exists') });
    expect(mockedRenameFolder).not.toBeCalled();
    expect(mockedConfigStoreSet).not.toBeCalled();
  });

  it('should return false when folder names are equal', async () => {
    const currentPathWithSameName = createAbsolutePath('/home/dev/Documents/project');
    const newPathWithSameName = createAbsolutePath('/mnt/external/project');

    mockedConfigStoreGet.mockReturnValue({
      [currentPathWithSameName]: { folderId: 12, folderUuid: 'folder-uuid', enabled: true },
    });

    const result = await changeBackupPath({ currentPath: currentPathWithSameName, newPath: newPathWithSameName });

    expect(result).toStrictEqual({ data: false });
    expect(mockedRenameFolder).not.toBeCalled();
    expect(mockedConfigStoreSet).not.toBeCalled();
  });

  it('should rename backup folder and move backup entry to the new path', async () => {
    const existingBackup = { folderId: 12, folderUuid: 'folder-uuid', enabled: true };
    const migratedBackup = { folderId: 12, folderUuid: 'folder-uuid', enabled: true };
    const backupList = {
      [currentPath]: existingBackup,
    };

    mockedConfigStoreGet.mockReturnValue(backupList);
    mockedRenameFolder.mockResolvedValue({ data: {} });
    mockedMigrateBackupEntryIfNeeded.mockResolvedValue({ data: migratedBackup });

    const result = await changeBackupPath({ currentPath, newPath });

    expect(result).toStrictEqual({ data: true });
    call(mockedRenameFolder).toStrictEqual({
      uuid: 'folder-uuid',
      plainName: 'new-backup',
    });
    call(mockedMigrateBackupEntryIfNeeded).toStrictEqual({ pathname: newPath, backup: existingBackup });
    call(mockedConfigStoreSet).toStrictEqual([
      'backupList',
      {
        [newPath]: migratedBackup,
      },
    ]);
  });

  it('should return error when rename request fails', async () => {
    const existingBackup = { folderId: 12, folderUuid: 'folder-uuid', enabled: true };

    mockedConfigStoreGet.mockReturnValue({ [currentPath]: existingBackup });
    mockedRenameFolder.mockResolvedValue({ error: new DriveServerError('UNKNOWN', undefined, 'rename failed') });

    const result = await changeBackupPath({ currentPath, newPath });

    expect(result).toMatchObject({ error: new Error('Error in the request to rename a backup') });
  });
});
