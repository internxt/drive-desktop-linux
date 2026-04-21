import configStore from '../../../apps/main/config';
import { createBackup } from '../../../apps/main/backups/create-backup';
import { DeviceModule } from '../device/device.module';
import { toAbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';

type Props = {
  folderPaths: string[];
};

export async function createBackupsFromLocalPaths({ folderPaths }: Props): Promise<void> {
  configStore.set('backupsEnabled', true);

  const { error, data } = await DeviceModule.getOrCreateDevice();
  if (error) {
    throw error;
  }

  const operations = folderPaths.map((folderPath) =>
    createBackup({ pathname: toAbsolutePath({ path: folderPath }), device: data }),
  );
  await Promise.all(operations);
}
