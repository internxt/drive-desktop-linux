import Checkbox from '../../../../components/Checkbox';
import { formatFileSize } from '../cleaner.service';
import { CleanableItem } from '../mocks';
import { Separator } from './Separator';

type SectionDetailMenuItemProps = {
  item: CleanableItem;
  sectionName: string;
  showSeparatorOnTop: boolean;
  selectedItems: { [sectionKey: string]: string[] };
  onToggleItem: (sectionKey: string, itemPath: string) => void;
};

export function SectionDetailMenuItem({
  item,
  sectionName,
  showSeparatorOnTop,
  selectedItems,
  onToggleItem,
}: SectionDetailMenuItemProps) {
  const isSelected = (selectedItems[sectionName] || []).includes(item.fullPath);

  return (
    <div key={item.fullPath}>
      {showSeparatorOnTop && <Separator size="small" />}

      <div className="flex cursor-pointer items-center px-2 py-4 transition-colors duration-500">
        <Checkbox
          label={item.fileName}
          className="font-semibold hover:cursor-pointer"
          checked={isSelected}
          onClick={() => onToggleItem(sectionName, item.fullPath)}
        />

        <div className="flex flex-1 items-end justify-end">
          <span className="text-sm text-gray-50">
            {formatFileSize(item.sizeInBytes)}
          </span>
        </div>
      </div>
    </div>
  );
}
