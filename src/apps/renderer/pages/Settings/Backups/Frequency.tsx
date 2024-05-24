import { useTranslationContext } from '../../../context/LocalContext';
import { useBackupsInterval } from '../../../hooks/backups/useBackupsInterval';
import FrequencySelector from './FrequencySelector';

export function Frequency() {
  const { backupsInterval, updateBackupsInterval } = useBackupsInterval();

  const { translate } = useTranslationContext();

  return (
    <>
      <p className="text-neutral-500">
        {translate('settings.backups.frequency.title')}
      </p>
      <FrequencySelector
        value={backupsInterval}
        onChange={updateBackupsInterval}
      />
    </>
  );
}
