import { CaretRight } from '@phosphor-icons/react';
import Checkbox from '../../../../components/Checkbox';
import { formatFileSize, sectionConfig } from '../cleaner.service';
import { CleanerSection } from '../mocks';
import { Separator } from './Separator';

type SectionItemProps = {
  sectionName: string;
  section: CleanerSection;
  showSeparatorOnTop: boolean;
  selectedItems: { [sectionName: string]: string[] };
  onToggleSection: (sectionName: string) => void;
  onToggleSectionExpansion: (sectionName: string) => void;
};

export function SectionItem({
  sectionName,
  section,
  showSeparatorOnTop,
  selectedItems,
  onToggleSection,
  onToggleSectionExpansion,
}: SectionItemProps) {
  const config = sectionConfig[sectionName as keyof typeof sectionConfig];
  const selectedInSection = selectedItems[sectionName] || [];
  const isSectionAllSelected =
    selectedInSection.length === section.items.length;
  const isSectionPartiallySelected =
    selectedInSection.length > 0 &&
    selectedInSection.length < section.items.length;

  return (
    <div key={sectionName}>
      {showSeparatorOnTop && <Separator size="small" />}

      <div className="flex cursor-pointer items-center px-2 py-4 transition-colors duration-500">
        <Checkbox
          label={config.name}
          className="font-semibold hover:cursor-pointer"
          checked={isSectionAllSelected || isSectionPartiallySelected}
          onClick={() => onToggleSection(sectionName)}
        />

        <div
          className="flex flex-1 items-end justify-end"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSectionExpansion(sectionName);
          }}
        >
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-50">
              {formatFileSize(section.totalSizeInBytes)}
            </span>
            <CaretRight color="#0066ff" weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}
