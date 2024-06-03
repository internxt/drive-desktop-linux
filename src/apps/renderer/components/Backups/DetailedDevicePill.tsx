import bytes from 'bytes';
import { Device } from '../../../main/device/service';
import { useTranslationContext } from '../../context/LocalContext';
import { useLastBackup } from '../../hooks/backups/useLastBackup';
import useUsage from '../../hooks/useUsage';
import { Pill } from '../Pill';
import { useEffect } from 'react';
import { useBackupProgress } from '../../hooks/backups/useBackupProgress';
import useBackupStatus from '../../hooks/backups/useBackupsStatus';
import { BackupsProgressBar } from './BackupsProgressBar';

interface DetailedDevicePillProps {
  device: Device;
}

export function DetailedDevicePill({ device }: DetailedDevicePillProps) {
  const { translate } = useTranslationContext();
  const { lastBackupTimestamp, fromNow } = useLastBackup();
  const { usage } = useUsage();
  const { backupStatus } = useBackupStatus();
  const { thereIsProgress, percentualProgress, clearProgress } =
    useBackupProgress();

  useEffect(() => {
    if (backupStatus === 'STANDBY') {
      clearProgress();
    }
  }, [backupStatus]);

  const progressDisplay = thereIsProgress()
    ? `(${percentualProgress().toFixed(0)}%)`
    : undefined;

  return (
    <div className="rounded-lg  border border-gray-10 bg-surface px-6 py-4 shadow-sm dark:bg-gray-5">
      <div className="flex w-full">
        <div className="grow">
          {device.name}
          <br />
          {lastBackupTimestamp !== -1 && (
            <>
              {translate('settings.backups.action.last-run')}&nbsp;
              {!progressDisplay && lastBackupTimestamp && <>{fromNow()}</>}
            </>
          )}
        </div>
        <Pill>{usage ? bytes.format(usage.limitInBytes) : ''}</Pill>
      </div>
      {progressDisplay && (
        <BackupsProgressBar progress={percentualProgress()} />
      )}
    </div>
  );
}
