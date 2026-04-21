import { PathLike } from 'fs';
import type { Device } from '../../../context/shared/domain/device/Device';
import { getUser } from '../../../apps/main/auth/service';
import { fetchFolder } from '../../../infra/drive-server/services/folder/services/fetch-folder';
import { getCredentials } from '../../../apps/main/auth/get-credentials';
import { downloadFolderAsZip } from '../../../apps/main/network/download';

type Props = {
  device: Device;
  path: PathLike;
  updateProgress: (progress: number) => void;
  abortController?: AbortController;
};

export async function downloadDeviceBackupZip({ device, path, updateProgress, abortController }: Props): Promise<void> {
  if (!device.id) {
    throw new Error('This backup has not been uploaded yet');
  }

  const user = getUser();
  if (!user) {
    throw new Error('No saved user');
  }

  const { data: folder, error } = await fetchFolder(device.uuid);
  if (error) {
    throw new Error('Unsuccesful request to fetch folder');
  }
  if (!folder || !folder.uuid || folder.uuid.length === 0) {
    throw new Error('No backup data found');
  }

  const networkApiUrl = process.env.BRIDGE_URL;
  const bridgeUser = user.bridgeUser;
  const bridgePass = user.userId;
  const { mnemonic } = getCredentials();

  await downloadFolderAsZip(
    device.name,
    networkApiUrl!,
    folder.uuid,
    path,
    {
      bridgeUser,
      bridgePass,
      encryptionKey: mnemonic,
    },
    {
      abortController,
      updateProgress,
    },
  );
}
