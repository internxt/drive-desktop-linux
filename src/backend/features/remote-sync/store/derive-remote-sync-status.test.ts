import { deriveRemoteSyncStatus } from './derive-remote-sync-status';

describe('derive-remote-sync-status', () => {
  it.each([
    {
      name: 'files only synced',
      props: {
        syncFiles: true,
        syncFolders: false,
        filesSyncStatus: 'SYNCED' as const,
        foldersSyncStatus: 'IDLE' as const,
      },
      expected: 'SYNCED',
    },
    {
      name: 'folders only synced',
      props: {
        syncFiles: false,
        syncFolders: true,
        filesSyncStatus: 'IDLE' as const,
        foldersSyncStatus: 'SYNCED' as const,
      },
      expected: 'SYNCED',
    },
    {
      name: 'both synced',
      props: {
        syncFiles: true,
        syncFolders: true,
        filesSyncStatus: 'SYNCED' as const,
        foldersSyncStatus: 'SYNCED' as const,
      },
      expected: 'SYNCED',
    },
    {
      name: 'files failed',
      props: {
        syncFiles: true,
        syncFolders: true,
        filesSyncStatus: 'SYNC_FAILED' as const,
        foldersSyncStatus: 'SYNCED' as const,
      },
      expected: 'SYNC_FAILED',
    },
    {
      name: 'folders failed',
      props: {
        syncFiles: true,
        syncFolders: true,
        filesSyncStatus: 'SYNCED' as const,
        foldersSyncStatus: 'SYNC_FAILED' as const,
      },
      expected: 'SYNC_FAILED',
    },
    {
      name: 'in progress',
      props: {
        syncFiles: true,
        syncFolders: true,
        filesSyncStatus: 'SYNCED' as const,
        foldersSyncStatus: 'IDLE' as const,
      },
      expected: null,
    },
  ])('should return $expected for $name', ({ props, expected }) => {
    expect(deriveRemoteSyncStatus(props)).toBe(expected);
  });
});
