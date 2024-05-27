import bytes from 'bytes';
import { Device } from '../../../../main/device/service';
import { DetailedDevicePill } from '../../../components/Backups/DetailedDevicePill';
import useBackupStatus from '../../../hooks/backups/useBackupsStatus';
import { useLastBackup } from '../../../hooks/backups/useLastBackup';
import useUsage from '../../../hooks/useUsage';
import { FoldersSelector } from './FoldersSelector';
import { Frequency } from './Frequency';
import { StartBackup } from './StartBackup';
import { ViewBackups } from './ViewBackups';

interface DeviceBackupsProps {
  device: Device;
  onGoToList: () => void;
}

export function DeviceBackups({ device, onGoToList }: DeviceBackupsProps) {
  const { backupStatus } = useBackupStatus();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-500">Backup</p>
      <DetailedDevicePill device={device} />
      <div className="grid grid-cols-2 gap-2">
        <StartBackup className="w-full " status={backupStatus} />
        <ViewBackups className="w-full" />
      </div>
      <FoldersSelector className="mt-2" onGoToList={onGoToList} />
      <div className="relative">
        <Frequency />
      </div>
    </div>
  );
}
