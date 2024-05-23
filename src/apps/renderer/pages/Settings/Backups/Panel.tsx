import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect } from 'react';
import Button from '../../../components/Button';
import Checkbox from '../../../components/Checkbox';
import { useTranslationContext } from '../../../context/LocalContext';
import { useBackupProgress } from '../../../hooks/backups/useBackupProgress';
import { useBackupsEnabled } from '../../../hooks/backups/useBackupsEnabled';
import useBackupStatus from '../../../hooks/backups/useBackupsStatus';
import { BackupFrequency } from './Frequency';
import { useLastBackup } from '../../../hooks/backups/useLastBackup';

dayjs.extend(relativeTime);

export default function BackupsPanel({
  onGoToList,
}: {
  onGoToList: () => void;
}) {
  const { enabled, toggleEnabled } = useBackupsEnabled();
  const { lastBackupTimestamp, refreshLastBackupTimestamp } = useLastBackup();
  const { thereIsProgress, percentualProgress, clearProgress } =
    useBackupProgress();
  const backupStatus = useBackupStatus();

  useEffect(() => {
    if (backupStatus === 'STANDBY') clearProgress();

    refreshLastBackupTimestamp();
  }, [backupStatus]);

  const { translate, language } = useTranslationContext();
  dayjs.locale(language);

  const progressDisplay = thereIsProgress()
    ? `(${percentualProgress().toFixed(0)}%)`
    : '';

  return (
    <>
      <div className="flex items-baseline space-x-2">
        <Checkbox
          checked={enabled}
          label={translate('settings.backups.activate')}
          onClick={toggleEnabled}
        />
        <a
          className="text-blue-60 text-right text-xs font-medium underline"
          href="https://drive.internxt.com/app/backups"
          target="_blank"
          rel="noopener noreferrer"
        >
          {translate('settings.backups.view-backups')}
        </a>
      </div>
      <Button className="mt-2" onClick={onGoToList}>
        {translate('settings.backups.select-folders')}
      </Button>
      <div className="flex items-baseline">
        <Button
          variant={backupStatus === 'STANDBY' ? 'primary' : 'danger'}
          disabled={!enabled}
          className="mt-2"
          onClick={
            backupStatus === 'STANDBY'
              ? window.electron.startBackupsProcess
              : window.electron.stopBackupsProcess
          }
        >
          {translate(
            `settings.backups.action.${
              backupStatus === 'STANDBY' ? 'start' : 'stop'
            }`
          )}
        </Button>
        <p className="text-m-neutral-100 ml-3 text-xs">
          {backupStatus === 'STANDBY'
            ? lastBackupTimestamp !== -1
              ? `${translate('settings.backups.action.last-run')} ${dayjs(
                  lastBackupTimestamp
                ).fromNow()}`
              : ''
            : `Backup in progress ${progressDisplay}`}
        </p>
      </div>
      <BackupFrequency />
    </>
  );
}
