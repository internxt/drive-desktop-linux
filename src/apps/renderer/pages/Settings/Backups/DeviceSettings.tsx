import dayjs from 'dayjs';
import { useEffect } from 'react';
import Button from '../../../components/Button';
import Checkbox from '../../../components/Checkbox';
import { useTranslationContext } from '../../../context/LocalContext';
import { useBackupProgress } from '../../../hooks/backups/useBackupProgress';
import { useBackupsEnabled } from '../../../hooks/backups/useBackupsEnabled';
import useBackupStatus from '../../../hooks/backups/useBackupsStatus';
import { useLastBackup } from '../../../hooks/backups/useLastBackup';
import { Frequency } from './Frequency';
import { EnableBackups } from './EnableBackups';
import { DeviceBackups } from './DeviceBackups';
import { useContext } from 'react';
import { DeviceContext } from '../../../context/DeviceContext';

interface DeviceSettingsProps extends React.HTMLAttributes<HTMLBaseElement> {
  onGoToList: () => void;
}

export function DeviceSettings({ onGoToList, className }: DeviceSettingsProps) {
  const { enabled, toggleEnabled } = useBackupsEnabled();
  const { lastBackupTimestamp, refreshLastBackupTimestamp } = useLastBackup();
  const { thereIsProgress, percentualProgress, clearProgress } =
    useBackupProgress();
  const { backupStatus } = useBackupStatus();

  useEffect(() => {
    if (backupStatus === 'STANDBY') clearProgress();

    refreshLastBackupTimestamp();
  }, [backupStatus]);

  const { translate, language } = useTranslationContext();
  dayjs.locale(language);

  const progressDisplay = thereIsProgress()
    ? `(${percentualProgress().toFixed(0)}%)`
    : '';

  const [state] = useContext(DeviceContext);

  return (
    <section className={className}>
      {!enabled || state.status !== 'SUCCESS' ? (
        <EnableBackups enable={toggleEnabled} />
      ) : (
        <>
          <DeviceBackups device={state.device} onGoToList={onGoToList} />
        </>
      )}
    </section>
  );
}
