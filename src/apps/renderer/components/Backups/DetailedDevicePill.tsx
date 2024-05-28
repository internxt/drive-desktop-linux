import bytes from 'bytes';
import { Device } from '../../../main/device/service';
import { useTranslationContext } from '../../context/LocalContext';
import { useLastBackup } from '../../hooks/backups/useLastBackup';
import useUsage from '../../hooks/useUsage';
import { Pill } from '../Pill';

interface DetailedDevicePillProps {
  device: Device;
}

export function DetailedDevicePill({ device }: DetailedDevicePillProps) {
  const { translate } = useTranslationContext();
  const { lastBackupTimestamp, fromNow } = useLastBackup();

  const { usage } = useUsage();

  return (
    <div className=" dark:bg-gray-5flex flex w-full rounded-lg border border-gray-10 bg-surface px-6 py-4 shadow-sm">
      <div className="grow">
        {device.name}
        <br />
        {lastBackupTimestamp !== -1 && (
          <>
            {translate('settings.backups.action.last-run')}&nbsp;
            {lastBackupTimestamp && <>{fromNow()}</>}
          </>
        )}
      </div>
      <Pill>{usage ? bytes.format(usage.limitInBytes) : ''}</Pill>
    </div>
  );
}
