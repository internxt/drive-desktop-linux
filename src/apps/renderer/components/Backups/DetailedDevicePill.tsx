import { Device } from '../../../main/device/service';
import useUsage from '../../hooks/useUsage';
import { SizePill } from './SizePill';
import { useEffect } from 'react';
import { useBackupProgress } from '../../hooks/backups/useBackupProgress';
import useBackupStatus from '../../hooks/backups/useBackupsStatus';
import { BackupsProgressBar } from './BackupsProgressBar';
import { BackupsProgressPercentage } from './BackupsProgressPercent';
import { ArrowCircleUp } from 'phosphor-react';
import { LastBackupMade } from './LastBackupMade';

interface DetailedDevicePillProps {
  device: Device;
}

function BackingUp() {
  return (
    <span className="flex flex-row items-center text-primary">
      <ArrowCircleUp className="mr-2 text-primary" /> Backing up...
    </span>
  );
}

export function DetailedDevicePill({ device }: DetailedDevicePillProps) {
  const { usage } = useUsage();
  const { backupStatus } = useBackupStatus();
  const { thereIsProgress, percentualProgress, clearProgress } =
    useBackupProgress();

  useEffect(() => {
    if (backupStatus === 'STANDBY') {
      clearProgress();
    }
  }, [backupStatus]);

  return (
    <div className="rounded-lg  border border-gray-10 bg-surface px-6 py-4 shadow-sm dark:bg-gray-5">
      <div className="flex w-full items-center">
        <div className="grow">
          {device.name}
          <br />
          {thereIsProgress() ? <BackingUp /> : <LastBackupMade />}
        </div>
        {thereIsProgress() ? (
          <BackupsProgressPercentage progress={percentualProgress()} />
        ) : (
          <SizePill size={usage?.limitInBytes ?? 0}></SizePill>
        )}
      </div>
      {thereIsProgress() && (
        <BackupsProgressBar progress={percentualProgress()} />
      )}
    </div>
  );
}
