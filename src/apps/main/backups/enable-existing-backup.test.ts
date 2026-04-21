import { enableExistingBackup } from './enable-existing-backup';
import configStore from '../config';
import { fetchFolder } from '../../../infra/drive-server/services/folder/services/fetch-folder';
import { createBackup } from './create-backup';
import { migrateBackupEntryIfNeeded } from '../../../backend/features/backup/migrate-backup-entry-if-needed';
import { PATHS } from '../../../core/electron/paths';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { createAbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';

vi.mock('../config');
vi.mock('../../../infra/drive-server/services/folder/services/fetch-folder');
vi.mock('./create-backup');
vi.mock('../../../backend/features/backup/migrate-backup-entry-if-needed');

const mockedConfigStore = vi.mocked(configStore);
const mockedFetchFolder = vi.mocked(fetchFolder);
const mockedCreateBackup = vi.mocked(createBackup);
const mockedMigrateBackupEntryIfNeeded = vi.mocked(migrateBackupEntryIfNeeded);

describe('enable-existing-backup', () => {
  const mockDevice = {
    id: 123,
    bucket: 'test-bucket',
    uuid: 'device-uuid',
    name: 'Test Device',
    removed: false,
    hasBackups: false,
  };

  const pathname = createAbsolutePath('/path/to/backup');
  const existingBackupData = {
    folderUuid: 'existing-uuid',
    folderId: 456,
    enabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create new backup when folder no longer exists', async () => {
    const mockNewBackupInfo = {
      folderUuid: 'new-folder-uuid',
      folderId: 789,
      pathname,
      name: 'backup',
      tmpPath: '/tmp',
      backupsBucket: 'test-bucket',
    };

    mockedConfigStore.get.mockReturnValue({ [pathname]: existingBackupData });
    mockedMigrateBackupEntryIfNeeded.mockResolvedValue(existingBackupData);
    mockedFetchFolder.mockResolvedValue({ error: new DriveServerError('NOT_FOUND') });
    mockedCreateBackup.mockResolvedValue(mockNewBackupInfo);

    const result = await enableExistingBackup({ pathname, device: mockDevice });

    expect(mockedMigrateBackupEntryIfNeeded).toBeCalledWith({ pathname, backup: existingBackupData });
    expect(mockedFetchFolder).toBeCalledWith(existingBackupData.folderUuid);
    expect(mockedCreateBackup).toBeCalledWith({ pathname, device: mockDevice });
    expect(result).toStrictEqual(mockNewBackupInfo);
  });

  it('should enable existing backup when folder still exists', async () => {
    const migratedBackup = {
      folderUuid: 'migrated-uuid',
      folderId: 456,
      enabled: false,
    };

    const updatedBackupList = {
      [pathname]: { ...migratedBackup, enabled: true },
    };

    mockedConfigStore.get
      .mockReturnValueOnce({ [pathname]: existingBackupData })
      .mockReturnValueOnce(updatedBackupList);

    mockedMigrateBackupEntryIfNeeded.mockResolvedValue(migratedBackup);
    mockedFetchFolder.mockResolvedValue({ data: { id: migratedBackup.folderId } } as any);

    const result = await enableExistingBackup({ pathname, device: mockDevice });

    expect(mockedMigrateBackupEntryIfNeeded).toBeCalledWith({ pathname, backup: existingBackupData });
    expect(mockedFetchFolder).toBeCalledWith(migratedBackup.folderUuid);
    expect(mockedConfigStore.set).toBeCalledWith('backupList', updatedBackupList);

    expect(result).toStrictEqual({
      folderUuid: migratedBackup.folderUuid,
      folderId: migratedBackup.folderId,
      pathname,
      name: 'backup',
      tmpPath: PATHS.TEMPORAL_FOLDER,
      backupsBucket: mockDevice.bucket,
    });
  });
});
