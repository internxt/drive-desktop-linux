import Button from '../../../components/Button';
import { useTranslationContext } from '../../../context/LocalContext';
import useBackupStatus from '../../../hooks/backups/useBackupsStatus';

interface BackupFoldersSelectorProps
  extends React.HTMLAttributes<HTMLBaseElement> {
  onGoToList: () => void;
}

export function FoldersSelector({
  className,
  onGoToList,
}: BackupFoldersSelectorProps) {
  const { translate } = useTranslationContext();
  const { backupStatus } = useBackupStatus();

  return (
    <div className={`${className}`}>
      <p className="text-neutral-500">
        {translate('settings.backups.select-folders')}
      </p>
      <Button
        variant="secondary"
        disabled={backupStatus === 'RUNNING'}
        onClick={onGoToList}
        size="md"
      >
        Change Folders
      </Button>
    </div>
  );
}
