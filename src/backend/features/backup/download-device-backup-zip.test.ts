import * as authServiceModule from '../../../apps/main/auth/service';
import * as fetchFolderModule from '../../../infra/drive-server/services/folder/services/fetch-folder';
import * as getCredentialsModule from '../../../apps/main/auth/get-credentials';
import * as downloadModule from '../../../apps/main/network/download';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { downloadDeviceBackupZip } from './download-device-backup-zip';

describe('download-device-backup-zip', () => {
  const getUserMock = partialSpyOn(authServiceModule, 'getUser');
  const fetchFolderMock = partialSpyOn(fetchFolderModule, 'fetchFolder');
  const getCredentialsMock = partialSpyOn(getCredentialsModule, 'getCredentials');
  const downloadFolderAsZipMock = partialSpyOn(downloadModule, 'downloadFolderAsZip');

  const updateProgress = vi.fn();
  const abortController = new AbortController();

  const device = {
    id: 1,
    uuid: 'device-uuid',
    name: 'Laptop',
    bucket: 'bucket',
    removed: false,
    hasBackups: true,
  };

  it('should throw when device has no id', async () => {
    await expect(
      downloadDeviceBackupZip({
        device: { ...device, id: 0 },
        path: '/tmp/backup.zip',
        updateProgress,
      }),
    ).rejects.toThrow('This backup has not been uploaded yet');
  });

  it('should throw when there is no saved user', async () => {
    getUserMock.mockReturnValue(null);

    await expect(downloadDeviceBackupZip({ device, path: '/tmp/backup.zip', updateProgress })).rejects.toThrow(
      'No saved user',
    );
  });

  it('should throw when folder fetch fails', async () => {
    getUserMock.mockReturnValue({ bridgeUser: 'bridge-user', userId: 'user-id' } as never);
    fetchFolderMock.mockResolvedValue({ error: new Error('fetch failed') } as never);

    await expect(downloadDeviceBackupZip({ device, path: '/tmp/backup.zip', updateProgress })).rejects.toThrow(
      'Unsuccesful request to fetch folder',
    );
  });

  it('should download backup zip with credentials and progress hooks', async () => {
    process.env.BRIDGE_URL = 'https://bridge.local';
    getUserMock.mockReturnValue({ bridgeUser: 'bridge-user', userId: 'user-id' } as never);
    fetchFolderMock.mockResolvedValue({ data: { uuid: 'folder-uuid' } } as never);
    getCredentialsMock.mockReturnValue({ mnemonic: 'mnemonic' } as never);
    downloadFolderAsZipMock.mockResolvedValue(undefined as never);

    await downloadDeviceBackupZip({ device, path: '/tmp/backup.zip', updateProgress, abortController });

    call(downloadFolderAsZipMock).toStrictEqual([
      'Laptop',
      'https://bridge.local',
      'folder-uuid',
      '/tmp/backup.zip',
      {
        bridgeUser: 'bridge-user',
        bridgePass: 'user-id',
        encryptionKey: 'mnemonic',
      },
      {
        abortController,
        updateProgress,
      },
    ]);
  });
});
