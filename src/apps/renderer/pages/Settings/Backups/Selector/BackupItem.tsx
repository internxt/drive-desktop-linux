import { WarningCircle } from '@phosphor-icons/react';
import { Backup } from '../../../../../main/device/service';
import FolderIcon from '../../../../assets/folder.svg';
import { useBackupFatalIssue } from '../../../../hooks/backups/useBackupFatalIssue';
import Button from '../../../../components/Button';

interface BackupListItemProps {
  backup: Backup;
  selected: boolean;
}

export function BackupListItem({ backup, selected }: BackupListItemProps) {
  const { issue, message } = useBackupFatalIssue(backup.id);

  return (
    <div className="flex w-full justify-between">
      <span className="flex-grow">
        <FolderIcon className="inline h-4 w-4 flex-shrink-0" />
        <p
          className="relative ml-1 inline select-none truncate leading-none"
          style={{ top: '1px' }}
        >
          {backup.name}
        </p>
      </span>
      {issue && (
        <span className={`${selected ? 'text-white' : 'text-red'}`}>
          <WarningCircle size={18} weight="fill" className="mr-1 inline" />
          {message()}
          <Button variant="secondary" className="ml-2">
            Locate folder
          </Button>
        </span>
      )}
    </div>
  );
}
