import Checkbox from '../../../../components/Checkbox';
import { useTranslationContext } from '../../../../context/LocalContext';

type Props = {
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: () => void;
};

export default function SectionsListHeadertype({
  isAllSelected,
  isPartiallySelected,
  onSelectAll,
}: Props) {
  const { translate } = useTranslationContext();
  return (
    <div className="mb-4 ml-2 flex flex-shrink-0 items-center justify-between">
      <Checkbox
        checked={isAllSelected || isPartiallySelected}
        label={translate('settings.cleaner.selectAllCheckbox')}
        onClick={onSelectAll}
      />
    </div>
  );
}
