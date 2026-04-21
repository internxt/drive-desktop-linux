import { unlink } from 'node:fs/promises';
import { IpcMainEvent, ipcMain } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { Device } from '../../../../context/shared/domain/device/Device';
import { getPathFromDialog } from '../../../../core/utils/get-path-from-dialog';
import { broadcastToWindows } from '../../windows';
import { downloadDeviceBackupZip } from '../../../../backend/features/backup/download-device-backup-zip';

type Props = {
  device: Device;
};

export async function downloadBackup({ device }: Props): Promise<void> {
  const chosenItem = await getPathFromDialog();
  if (!chosenItem || !chosenItem.path) {
    return;
  }

  const chosenPath = chosenItem.path;
  logger.debug({
    tag: 'BACKUPS',
    msg: '[BACKUPS] Downloading Device',
    deviceName: device.name,
    chosenPath,
  });

  const date = new Date();
  const now =
    String(date.getFullYear()) +
    String(date.getMonth() + 1) +
    String(date.getDay()) +
    String(date.getHours()) +
    String(date.getMinutes()) +
    String(date.getSeconds());
  const zipFilePath = chosenPath + 'Backup_' + now + '.zip';

  const abortController = new AbortController();

  const abortListener = (_: IpcMainEvent, abortDeviceUuid: string) => {
    if (abortDeviceUuid === device.uuid) {
      abortController.abort();
    }
  };

  const listenerName = 'abort-download-backups-' + device.uuid;
  const removeListenerIpc = ipcMain.on(listenerName, abortListener);

  try {
    await downloadDeviceBackupZip({
      device,
      path: zipFilePath,
      updateProgress: (progress) => {
        if (abortController.signal.aborted) {
          return;
        }

        broadcastToWindows('backup-download-progress', {
          id: device.uuid,
          progress,
        });
      },
      abortController,
    });
  } catch {
    try {
      await unlink(zipFilePath);
    } catch {
      /* noop */
    }
  }

  removeListenerIpc.removeListener(listenerName, abortListener);
}
