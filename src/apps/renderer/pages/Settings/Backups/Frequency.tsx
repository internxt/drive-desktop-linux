import Select from '../../../components/Select';
import { useTranslationContext } from '../../../context/LocalContext';
import { useBackupsInterval } from '../../../hooks/backups/useBackupsInterval';

export function Frequency() {
  const { backupsInterval, updateBackupsInterval } = useBackupsInterval();

  const { translate } = useTranslationContext();

  const intervals = [
    {
      value: 6 * 3600 * 1000,
      name: translate('settings.backups.frequency.options.6h'),
    },
    {
      value: 12 * 3600 * 1000,
      name: translate('settings.backups.frequency.options.12h'),
    },
    {
      value: 24 * 3600 * 1000,
      name: translate('settings.backups.frequency.options.24h'),
    },
    {
      value: -1,
      name: translate('settings.backups.frequency.options.manually'),
    },
  ].map(({ value, name }) => ({ value: value.toString(), name }));

  const onStringValueChange = (value: string) =>
    updateBackupsInterval(Number(value));

  return (
    <>
      <p className="text-neutral-500">
        {translate('settings.backups.frequency.title')}
      </p>
      <Select
        options={intervals}
        value={backupsInterval.toString()}
        onValueChange={onStringValueChange}
      />
    </>
  );
}
