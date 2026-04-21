import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import type { Device } from '../../../context/shared/domain/device/Device';

export async function getActiveBackupDevices(): Promise<Array<Device>> {
  try {
    const response = await driveServerModule.backup.getDevices();
    if (response.isLeft()) {
      return [];
    }

    const devices = response.getRight();
    return devices.filter(({ removed, hasBackups }) => !removed && hasBackups).map((device) => device);
  } catch {
    return [];
  }
}
