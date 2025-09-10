import Checkbox from '../../../../components/Checkbox';

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
  return (
    <div className="ml-2 mb-4 flex flex-shrink-0 items-center justify-between">
      <Checkbox
        checked={isAllSelected || isPartiallySelected}
        label={'Select All'}
        onClick={onSelectAll}
      />
    </div>
  );
}
