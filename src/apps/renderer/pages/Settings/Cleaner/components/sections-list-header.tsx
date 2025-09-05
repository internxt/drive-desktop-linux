import Checkbox from '../../../../components/Checkbox';

type Props = {
  deviceName: string;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: () => void;
};

export default function SectionsListHeadertype({
  deviceName,
  isAllSelected,
  isPartiallySelected,
  onSelectAll,
}: Props) {
  return (
    <div className="mb-6 flex flex-shrink-0 items-center justify-between">
      <h2 className="text-gray-900 text-lg font-semibold dark:text-gray-100">
        {deviceName}
      </h2>
      <Checkbox
        checked={isAllSelected || isPartiallySelected}
        label={'Select All'}
        onClick={onSelectAll}
      />
    </div>
  );
}
