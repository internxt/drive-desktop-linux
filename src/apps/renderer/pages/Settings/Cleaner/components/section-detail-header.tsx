import { useTranslationContext } from '../../../../context/LocalContext';
import Checkbox from '../../../../components/Checkbox';
import { CaretDoubleRight } from '@phosphor-icons/react';
type Props = {
  sectionName: string;
  onClose: () => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  isEmpty?: boolean;
  onSelectAll: () => void;
};

export default function SectionDetailHeader({
  onClose,
  isAllSelected,
  isPartiallySelected,
  isEmpty = false,
  onSelectAll,
}: Props) {
  const { translate } = useTranslationContext();
  return (
    <div className="flex items-center justify-between p-4 dark:bg-gray-5">
      <div className="flex items-center gap-3">
        <div
          className="text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:cursor-pointer"
          onClick={onClose}>
          <CaretDoubleRight color="#0066ff" weight="bold" />
        </div>
      </div>
      <Checkbox
        checked={isAllSelected}
        indeterminate={isPartiallySelected && !isAllSelected}
        disabled={isEmpty}
        label={translate('settings.cleaner.selectAllCheckbox')}
        onClick={() => !isEmpty && onSelectAll()}
      />
    </div>
  );
}
