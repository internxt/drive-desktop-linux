import { useTranslationContext } from '../../../context/LocalContext';
import { useBackupsInterval } from '../../../hooks/backups/useBackupsInterval';
import Dropdown from './Dropdown';

export function BackupFrequency() {
  const { backupsInterval, updateBackupsInterval } = useBackupsInterval();

  const { translate } = useTranslationContext();

  return (
    <>
      <p className="text-neutral-500 mt-6 text-xs">
        {translate('settings.backups.frequency.title')}
      </p>
      <Dropdown value={backupsInterval} onChange={updateBackupsInterval} />
    </>
  );
}
