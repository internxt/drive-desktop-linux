import Button from '../../../components/Button';
import { useTranslationContext } from '../../../context/LocalContext';
import { useBackups } from '../../../hooks/backups/useBackups';
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
  const { backups } = useBackups();

  return (
    <div className={`${className}`}>
      <p className="text-neutral-500">
        {translate('settings.backups.selected-folders-title')}
      </p>
      <Button
        variant="secondary"
        disabled={backupStatus === 'RUNNING'}
        onClick={onGoToList}
        size="md"
      >
        {translate('settings.backups.select-folders')}
      </Button>
      <span className="ml-2 text-gray-60">
        {translate('settings.backups.selected-folder', {
          count: backups.length,
        })}
      </span>
    </div>
  );
}
