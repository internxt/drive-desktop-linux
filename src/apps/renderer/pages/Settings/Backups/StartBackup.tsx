import Button from '../../../components/Button';
import { useTranslationContext } from '../../../context/LocalContext';
import useBackupStatus from '../../../hooks/backups/useBackupsStatus';

type StartBackupProps = React.HTMLAttributes<HTMLBaseElement>;

export function StartBackup({ className }: StartBackupProps) {
  const { translate } = useTranslationContext();

  const { backupStatus } = useBackupStatus();

  return (
    <Button
      className={`${className} hover:cursor-pointer`}
      variant={backupStatus === 'STANDBY' ? 'primary' : 'danger'}
      size="md"
      onClick={() => {
        backupStatus === 'STANDBY'
          ? window.electron.startBackupsProcess()
          : window.electron.stopBackupsProcess();
      }}
    >
      {translate(
        `settings.backups.action.${
          backupStatus === 'STANDBY' ? 'start' : 'stop'
        }`
      )}
    </Button>
  );
}
