import { useTranslationContext } from '../../../context/LocalContext';
import Select from '../../../components/Select';

interface FrequencySelectorProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export default function FrequencySelector({
  value,
  onChange,
  className = '',
}: FrequencySelectorProps) {
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

  const onChangeWrapper = (value: string) => onChange(Number(value));

  return (
    <div className={className}>
      <Select
        options={intervals}
        value={value.toString()}
        onValueChange={onChangeWrapper}
      />
    </div>
  );
}
