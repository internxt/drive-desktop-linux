import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import type { Device } from '../backup/types/Device';
import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';

export async function getActiveBackupDevices(): Promise<Array<Device>> {
  try {
    const response = await driveServerModule.backup.getDevices();
    if (response.isLeft()) {
      logger.error({ tag: 'BACKUPS', msg: 'Failed to fetch devices for backup', error: response.getLeft() });
      return [];
    }

    const devices = response.getRight();
    return devices.filter(({ removed, hasBackups }) => !removed && hasBackups).map((device) => device);
  } catch (error) {
    logger.error({ tag: 'BACKUPS', msg: 'Failed to fetch devices for backup', error });
    return [];
  }
}
