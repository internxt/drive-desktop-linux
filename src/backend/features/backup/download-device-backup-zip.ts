import { PathLike } from 'node:fs';
import type { Device } from '../../../context/shared/domain/device/Device';
import { getUser } from '../../../apps/main/auth/service';
import { fetchFolder } from '../../../infra/drive-server/services/folder/services/fetch-folder';
import { getCredentials } from '../../../apps/main/auth/get-credentials';
import { downloadFolderAsZip } from '../../../apps/main/network/download';
import { logger } from '@internxt/drive-desktop-core/build/backend';

type Props = {
  device: Device;
  path: PathLike;
  updateProgress: (progress: number) => void;
  abortController?: AbortController;
};

export async function downloadDeviceBackupZip({ device, path, updateProgress, abortController }: Props): Promise<void> {
  const user = getUser();
  if (!user) {
    throw logger.error({ tag: 'BACKUPS', msg: 'No user found when trying to download backup' });
  }

  const { data: folder, error } = await fetchFolder(device.uuid);
  if (error) {
    throw logger.error({ tag: 'BACKUPS', msg: 'Unsuccesful request to fetch folder', error });
  }

  if (!folder || folder.uuid.length === 0) {
    throw logger.error({ tag: 'BACKUPS', msg: 'No backup data found' });
  }

  const networkApiUrl = process.env.BRIDGE_URL;
  const bridgeUser = user.bridgeUser;
  const bridgePass = user.userId;
  const { mnemonic } = getCredentials();

  await downloadFolderAsZip(
    device.name,
    networkApiUrl,
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
