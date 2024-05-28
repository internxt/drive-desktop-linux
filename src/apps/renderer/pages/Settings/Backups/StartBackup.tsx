import { BackupsStatus } from '../../../../main/background-processes/backups/BackupsProcessStatus/BackupsStatus';
import Button from '../../../components/Button';
import { useTranslationContext } from '../../../context/LocalContext';

interface StartBackupProps extends React.HTMLAttributes<HTMLBaseElement> {
  status: BackupsStatus;
}

export function StartBackup({ status, className }: StartBackupProps) {
  const { translate } = useTranslationContext();

  return (
    <Button
      className={`${className} hover:cursor-pointer`}
      variant={status === 'STANDBY' ? 'primary' : 'danger'}
      size="md"
      onClick={() => {
        status === 'STANDBY'
          ? window.electron.startBackupsProcess()
          : window.electron.stopBackupsProcess();
      }}
    >
      {translate(
        `settings.backups.action.${status === 'STANDBY' ? 'start' : 'stop'}`
      )}
    </Button>
  );
}
