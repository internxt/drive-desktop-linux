import { postBackup } from "./post-backup";
import { BackupError } from "../../backups/BackupError";
import { createBackupFolder } from '../../../infra/drive-server/services/backup/services/create-backup-folder';
import { logger } from "@internxt/drive-desktop-core/build/backend";

jest.mock('../../../infra/drive-server/services/backup/services/create-backup-folder');

const mockCreateBackupFolder = jest.mocked(createBackupFolder);
const mockLogger = jest.mocked(logger);

describe('postBackup', () => {
  const mockDevice = {
    id: 1,
    uuid: 'device-123',
    bucket: 'test-bucket',
    name: 'Test Device',
    removed: false,
    hasBackups: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create backup successfully', async () => {
    mockCreateBackupFolder.mockResolvedValue({
      data: {
        id: 456,
        plainName: 'My Folder',
        uuid: 'folder-uuid-789'
      }
    } as any);

    const result = await postBackup({
      folderName: 'My Folder',
      device: mockDevice
    });

    expect(mockCreateBackupFolder).toBeCalledWith('device-123', 'My Folder');
    expect(result).toEqual({
      id: 456,
      name: 'My Folder',
      uuid: 'folder-uuid-789'
    });
  });

  it('should handle errors and return undefined', async () => {
    mockCreateBackupFolder.mockResolvedValue({
      error: new BackupError('NOT_EXISTS')
    });

    const result = await postBackup({
      folderName: 'Failed Folder',
      device: mockDevice
    });

    expect(mockLogger.error).toHaveBeenCalledWith({
      tag: 'BACKUPS',
      msg: 'Error creating backup folder',
      folderName: 'Failed Folder',
      error: expect.any(BackupError),
    });
    expect(result).toBeUndefined();
  });
});