import bytes from 'bytes';
import { Device } from '../../../main/device/service';
import { useLastBackup } from '../../hooks/backups/useLastBackup';
import useUsage from '../../hooks/useUsage';
import { Pill } from '../Pill';

interface DetailedDevicePillProps {
  device: Device;
}

export function DetailedDevicePill({ device }: DetailedDevicePillProps) {
  const { lastBackupTimestamp } = useLastBackup();
  const { usage } = useUsage();

  return (
    <div className=" dark:bg-gray-5flex flex w-full rounded-lg border border-gray-10 bg-surface px-6 py-4 shadow-sm">
      <div className="grow">
        {device.name}
        {lastBackupTimestamp ?? ''}
      </div>
      <Pill>{usage ? bytes.format(usage.limitInBytes) : ''}</Pill>
    </div>
  );
}
