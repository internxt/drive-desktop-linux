import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import { left, right } from '../../../context/shared/domain/Either';
import { ensureBackupListHasUuids, needsBackupListMigration } from './device.utils';

jest.mock('../../../infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    folders: {
      getFolderMetadata: jest.fn(),
    },
  },
}));


describe('device utils', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  describe('ensureBackupListHasUuids', () => {
    const folderDto = {
      id: 123,
      uuid: 'folder-uuid-123',
      name: 'My Folder',
      plainName: 'My Folder',
      children: [],
      files: [],
    };
    it('should fill folderUuid for entries that do not have it', async () => {
      const backupList = {
        '/user/docs': { enabled: true, folderId: 123 },
      };

      (driveServerModule.folders.getFolderMetadata as jest.Mock).mockResolvedValueOnce(
        right(folderDto)
      );

      const result = await ensureBackupListHasUuids(backupList);

      expect(result['/user/docs'].folderUuid).toBe('folder-uuid-123');
      expect(result['/user/docs'].folderId).toBe(123);
    });

    it('should preserve entries that already have folderUuid', async () => {
      const backupList = {
        '/user/pics': {
          enabled: true,
          folderId: 456,
          folderUuid: 'existing-uuid',
        },
      };

      const result = await ensureBackupListHasUuids(backupList);

      expect(driveServerModule.folders.getFolderMetadata).not.toHaveBeenCalled();
      expect(result['/user/pics'].folderUuid).toBe('existing-uuid');
    });

    it('should fallback to empty uuid on failure', async () => {
      const backupList = {
        '/user/fail': { enabled: true, folderId: 999 },
      };

      (driveServerModule.folders.getFolderMetadata as jest.Mock).mockResolvedValueOnce(
        left(new Error('uncontrolled error'))
      );

      const result = await ensureBackupListHasUuids(backupList);

      expect(result['/user/fail'].folderUuid).toBe('');
    });

  });

  describe('needsBackupListMigration', () => {
    it('returns true if any entry is missing folderUuid', () => {
      const backupList = {
        '/a': { enabled: true, folderId: 1 },
        '/b': { enabled: true, folderId: 2, folderUuid: 'abc' },
      };

      const result = needsBackupListMigration(backupList);
      expect(result).toBe(true);
    });

    it('returns false if all entries have valid folderUuid', () => {
      const backupList = {
        '/a': { enabled: true, folderId: 1, folderUuid: 'uuid-a' },
        '/b': { enabled: false, folderId: 2, folderUuid: 'uuid-b' },
      };

      const result = needsBackupListMigration(backupList);
      expect(result).toBe(false);
    });

    it('ignores empty strings as valid folderUuid', () => {
      const backupList = {
        '/a': { enabled: true, folderId: 1, folderUuid: '' },
      };

      const result = needsBackupListMigration(backupList);
      expect(result).toBe(true);
    });

    it('ignores null as valid folderUuid', () => {
      const backupList = {
        '/a': { enabled: true, folderId: 1, folderUuid: null },
      };

      const result = needsBackupListMigration(backupList as any);
      expect(result).toBe(true);
    });

    it('ignores undefined as valid folderUuid', () => {
      const backupList = {
        '/a': { enabled: true, folderId: 1, folderUuid: undefined },
      };

      const result = needsBackupListMigration(backupList as any);
      expect(result).toBe(true);
    });

    it('ignores whitespace as valid folderUuid', () => {
      const backupList = {
        '/a': { enabled: true, folderId: 1, folderUuid: '    ' },
      };

      const result = needsBackupListMigration(backupList as any);
      expect(result).toBe(true);
    });

    it('ignores not passing property as valid folderUuid', () => {
      const backupList = {
        '/a': { enabled: true, folderId: 1},
      };

      const result = needsBackupListMigration(backupList as any);
      expect(result).toBe(true);
    });
  });
});
