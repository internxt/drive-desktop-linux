import { Backup } from '../../../../../main/device/service';
import FolderIcon from '../../../../assets/folder.svg';

interface BackupsListProps {
  backups: Array<Backup>;
  selected: Backup | null;
  setSelected: (backup: Backup) => void;
}

export function BackupsList({
  backups,
  selected,
  setSelected,
}: BackupsListProps) {
  return (
    <ul>
      {backups.map((backup, index) => (
        <li
          onClick={(e) => {
            e.stopPropagation();
            setSelected(backup);
          }}
          role="row"
          onKeyDown={() => setSelected(backup)}
          tabIndex={0}
          key={backup.id}
          className={`flex w-full items-center overflow-hidden p-2 transition-colors duration-75 ${
            selected?.id === backup.id
              ? 'bg-primary text-white'
              : index % 2 !== 0
              ? 'text-neutral-700 bg-white'
              : 'bg-l-neutral-10 text-neutral-700'
          }`}
        >
          <FolderIcon className="h-4 w-4 flex-shrink-0" />
          <p
            className="relative ml-1 flex-grow select-none truncate leading-none"
            style={{ top: '1px' }}
          >
            {backup.name}
          </p>
        </li>
      ))}
    </ul>
  );
}
