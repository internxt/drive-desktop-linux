import configStoreModule from '../../../apps/main/config';
import * as getBackupFolderUuidModule from '../../../infra/drive-server/services/folder/services/fetch-backup-folder-uuid';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { migrateBackupEntryIfNeeded } from './migrate-backup-entry-if-needed';
import { loggerMock } from 'tests/vitest/mocks.helper';

describe('migrate-backup-entry-if-needed', () => {
  const getBackupFolderUuidMock = partialSpyOn(getBackupFolderUuidModule, 'getBackupFolderUuid');
  const configStoreGetMock = partialSpyOn(configStoreModule, 'get');
  const configStoreSetMock = partialSpyOn(configStoreModule, 'set');

  it('should return backup as-is when folderUuid already exists', async () => {
    const backup = { folderId: 1, folderUuid: 'existing-uuid', enabled: true };

    const result = await migrateBackupEntryIfNeeded({ pathname: '/home/dev/Documents', backup });

    expect(result).toStrictEqual(backup);
    expect(getBackupFolderUuidMock).not.toBeCalled();
    expect(configStoreSetMock).not.toBeCalled();
  });

  it('should migrate backup by fetching folder uuid and persisting it', async () => {
    const pathname = '/home/dev/Documents';
    const backup = { folderId: 1, folderUuid: '', enabled: true };
    const backupList = { [pathname]: backup };

    getBackupFolderUuidMock.mockResolvedValue({ data: 'new-folder-uuid' });
    configStoreGetMock.mockReturnValue(backupList);

    const result = await migrateBackupEntryIfNeeded({ pathname, backup });

    expect(result.folderUuid).toBe('new-folder-uuid');
    call(configStoreSetMock).toStrictEqual(['backupList', backupList]);
  });

  it('should throw when folder uuid retrieval fails', async () => {
    const error = new Error('uuid request failed');
    const backup = { folderId: 1, folderUuid: '', enabled: true };

    getBackupFolderUuidMock.mockResolvedValue({ error } as never);

    await expect(migrateBackupEntryIfNeeded({ pathname: '/home/dev/Documents', backup })).rejects.toThrow(
      error.message,
    );
    expect(loggerMock.error).toBeCalled();
  });
});
