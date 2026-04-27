import { app } from 'electron';
import configStore from '../../../apps/main/config';
import { findBackupPathnameFromId } from '../backup/find-backup-pathname-from-id';
import { fetchFolder } from '../../../infra/drive-server/services/folder/services/fetch-folder';
import { getBackupsFromDevice } from './getBackupsFromDevice';

vi.mock('electron', async (importOriginal) => {
  const actual = await importOriginal<typeof import('electron')>();

  return {
    ...actual,
    app: {
      ...actual.app,
      getPath: vi.fn().mockReturnValue('/tmp/backups'),
    },
    ipcMain: {
      ...actual.ipcMain,
      on: vi.fn(),
      handle: vi.fn(),
      removeHandler: vi.fn(),
    },
  };
});
vi.mock('../../../infra/drive-server/services/folder/services/fetch-folder');
vi.mock('../../../apps/main/config', () => ({
  default: { get: vi.fn() },
}));
vi.mock('../backup/find-backup-pathname-from-id', () => ({
  findBackupPathnameFromId: vi.fn(),
}));

describe('getBackupsFromDevice', () => {
  const mockedFetchFolder = vi.mocked(fetchFolder);
  const mockedConfigStore = vi.mocked(configStore);
  const mockedFindBackupPathnameFromId = vi.mocked(findBackupPathnameFromId);
  const mockedAppGetPath = vi.mocked(app.getPath);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAppGetPath.mockReturnValue('/tmp/backups');
  });

  it('should return only error when fetching the folder fails', async () => {
    const error = new Error('Folder fetch failed');
    mockedFetchFolder.mockResolvedValue({ error } as never);

    const result = await getBackupsFromDevice({ uuid: 'device-uuid', bucket: 'bucket-1' } as never, false);

    expect(result.error).toBe(error);
    expect(result.data).toBeUndefined();
  });

  it('should return only data when the backups are retrieved for a non-current device', async () => {
    mockedConfigStore.get.mockReturnValue({});
    mockedFetchFolder.mockResolvedValue({
      data: {
        children: [{ id: 1, uuid: 'folder-uuid', plainName: 'Documents' }],
      },
    } as never);

    const result = await getBackupsFromDevice({ uuid: 'device-uuid', bucket: 'bucket-1' } as never, false);

    expect(result).toStrictEqual({
      data: [
        {
          name: 'Documents',
          pathname: '.',
          folderId: 1,
          folderUuid: 'folder-uuid',
          tmpPath: '',
          backupsBucket: 'bucket-1',
        },
      ],
    });
  });

  it('should return only enabled current backups with their mapped pathname', async () => {
    mockedConfigStore.get.mockReturnValue({
      '/home/docs': { enabled: true, folderId: 1, folderUuid: 'folder-uuid-1' },
      '/home/photos': { enabled: false, folderId: 2, folderUuid: 'folder-uuid-2' },
    });
    mockedFindBackupPathnameFromId.mockImplementation(({ id }: { id: number }) => {
      if (id === 1) return '/home/docs';
      if (id === 2) return '/home/photos';
      return undefined;
    });
    mockedFetchFolder.mockResolvedValue({
      data: {
        children: [
          { id: 1, uuid: 'folder-uuid-1', plainName: 'Documents', bucket: 'bucket-docs' },
          { id: 2, uuid: 'folder-uuid-2', plainName: 'Photos', bucket: 'bucket-photos' },
        ],
      },
    } as never);

    const result = await getBackupsFromDevice({ uuid: 'device-uuid', bucket: 'bucket-1' } as never, true);

    expect(result).toStrictEqual({
      data: [
        {
          name: 'Documents',
          pathname: '/home/docs',
          folderId: 1,
          folderUuid: 'folder-uuid-1',
          tmpPath: '/tmp/backups',
          backupsBucket: 'bucket-docs',
        },
      ],
    });
  });

  it('should return an empty list when current backups are missing a pathname or are disabled', async () => {
    mockedConfigStore.get.mockReturnValue({
      '/home/photos': { enabled: false, folderId: 2, folderUuid: 'folder-uuid-2' },
    });
    mockedFindBackupPathnameFromId.mockImplementation(({ id }: { id: number }) => {
      if (id === 2) return '/home/photos';
      return undefined;
    });
    mockedFetchFolder.mockResolvedValue({
      data: {
        children: [
          { id: 1, uuid: 'folder-uuid-1', plainName: 'Documents', bucket: 'bucket-docs' },
          { id: 2, uuid: 'folder-uuid-2', plainName: 'Photos', bucket: 'bucket-photos' },
        ],
      },
    } as never);

    const result = await getBackupsFromDevice({ uuid: 'device-uuid', bucket: 'bucket-1' } as never, true);

    expect(result).toStrictEqual({ data: [] });
  });
});
