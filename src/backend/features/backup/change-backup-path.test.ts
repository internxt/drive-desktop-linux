import * as getPathFromDialogModule from '../../../core/utils/get-path-from-dialog';
import * as getBackupFolderUuidModule from '../../../infra/drive-server/services/folder/services/fetch-backup-folder-uuid';
import * as renameFolderModule from '../../../infra/drive-server/services/folder/services/rename-folder';
import * as migrateBackupEntryIfNeededModule from './migrate-backup-entry-if-needed';
import configStoreModule from '../../../apps/main/config';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { changeBackupPath } from './change-backup-path';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';

describe('change-backup-path', () => {
  const mockedConfigStoreGet = partialSpyOn(configStoreModule, 'get');
  const mockedConfigStoreSet = partialSpyOn(configStoreModule, 'set');
  const mockedGetPathFromDialog = partialSpyOn(getPathFromDialogModule, 'getPathFromDialog');
  const mockedGetBackupFolderUuid = partialSpyOn(getBackupFolderUuidModule, 'getBackupFolderUuid');
  const mockedRenameFolder = partialSpyOn(renameFolderModule, 'renameFolder');
  const mockedMigrateBackupEntryIfNeeded = partialSpyOn(migrateBackupEntryIfNeededModule, 'migrateBackupEntryIfNeeded');

  const currentPath = '/home/dev/Documents/current-backup/';
  const chosenPath = '/home/dev/Documents/new-backup/';

  it('should throw when backup no longer exists', async () => {
    mockedConfigStoreGet.mockReturnValue({});

    await expect(changeBackupPath({ currentPath })).rejects.toThrow('Backup no longer exists');
  });

  it('should return false when user does not choose a path', async () => {
    mockedConfigStoreGet.mockReturnValue({
      [currentPath]: { folderId: 12, folderUuid: 'folder-uuid', enabled: true },
    });
    mockedGetPathFromDialog.mockResolvedValue(null);

    const result = await changeBackupPath({ currentPath });

    expect(result).toBe(false);
    expect(mockedGetBackupFolderUuid).not.toBeCalled();
    expect(mockedRenameFolder).not.toBeCalled();
    expect(mockedConfigStoreSet).not.toBeCalled();
  });

  it('should throw when chosen path already exists as backup', async () => {
    const existingBackup = { folderId: 12, folderUuid: 'folder-uuid', enabled: true };

    mockedConfigStoreGet.mockReturnValue({
      [currentPath]: existingBackup,
      [chosenPath]: { folderId: 99, folderUuid: 'another-folder-uuid', enabled: true },
    });
    mockedGetPathFromDialog.mockResolvedValue({ path: chosenPath, itemName: 'new-backup' });

    await expect(changeBackupPath({ currentPath })).rejects.toThrow('A backup with this path already exists');
  });

  it('should return false when folder names are equal', async () => {
    const currentPathWithSameName = '/home/dev/Documents/project/';
    const chosenPathWithSameName = '/mnt/external/project/';

    mockedConfigStoreGet.mockReturnValue({
      [currentPathWithSameName]: { folderId: 12, folderUuid: 'folder-uuid', enabled: true },
    });
    mockedGetPathFromDialog.mockResolvedValue({ path: chosenPathWithSameName, itemName: 'project' });

    const result = await changeBackupPath({ currentPath: currentPathWithSameName });

    expect(result).toBe(false);
    expect(mockedGetBackupFolderUuid).not.toBeCalled();
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
    mockedGetPathFromDialog.mockResolvedValue({ path: chosenPath, itemName: 'new-backup' });
    mockedGetBackupFolderUuid.mockResolvedValue({ data: 'remote-folder-uuid' });
    mockedRenameFolder.mockResolvedValue({ data: {} as any });
    mockedMigrateBackupEntryIfNeeded.mockResolvedValue(migratedBackup);

    const result = await changeBackupPath({ currentPath });

    expect(result).toBe(true);
    call(mockedGetBackupFolderUuid).toStrictEqual({ folderId: '12' });
    call(mockedRenameFolder).toStrictEqual({
      uuid: 'remote-folder-uuid',
      plainName: 'new-backup',
    });
    call(mockedMigrateBackupEntryIfNeeded).toStrictEqual({ pathname: chosenPath, backup: existingBackup });
    call(mockedConfigStoreSet).toStrictEqual([
      'backupList',
      {
        [chosenPath]: migratedBackup,
      },
    ]);
  });

  it('should throw when resolving remote backup folder uuid fails', async () => {
    const existingBackup = { folderId: 12, folderUuid: 'folder-uuid', enabled: true };
    const error = new DriveServerError('UNKNOWN', undefined, 'uuid lookup failed');

    mockedConfigStoreGet.mockReturnValue({ [currentPath]: existingBackup });
    mockedGetPathFromDialog.mockResolvedValue({ path: chosenPath, itemName: 'new-backup' });
    mockedGetBackupFolderUuid.mockResolvedValue({ error });

    await expect(changeBackupPath({ currentPath })).rejects.toThrow(error.message);
  });

  it('should throw when rename request fails', async () => {
    const existingBackup = { folderId: 12, folderUuid: 'folder-uuid', enabled: true };

    mockedConfigStoreGet.mockReturnValue({ [currentPath]: existingBackup });
    mockedGetPathFromDialog.mockResolvedValue({ path: chosenPath, itemName: 'new-backup' });
    mockedGetBackupFolderUuid.mockResolvedValue({ data: 'remote-folder-uuid' });
    mockedRenameFolder.mockResolvedValue({ error: new DriveServerError('UNKNOWN', undefined, 'rename failed') });

    await expect(changeBackupPath({ currentPath })).rejects.toThrow('Error in the request to rename a backup');
  });
});
