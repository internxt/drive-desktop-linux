import { CleanerReport } from '../mocks';
import { CleanerViewModel } from '../types/cleaner-viewmodel';
import { Separator } from './Separator';
import SectionsListHeadertype from './sections-list-header';
import { SectionItem } from './section-item';

type Props = {
  report: CleanerReport;
  viewModel: CleanerViewModel;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: () => void;
  onToggleSection: (sectionName: string) => void;
  onToggleSectionExpansion: (sectionName: string) => void;
};

export function SectionsList({
  report,
  viewModel,
  isAllSelected,
  isPartiallySelected,
  onSelectAll,
  onToggleSection,
  onToggleSectionExpansion,
}: Props) {
  return (
    <div className="flex h-full w-1/2 flex-col p-6">
      <SectionsListHeadertype
        deviceName={'Device Name'}
        isAllSelected={isAllSelected}
        isPartiallySelected={isPartiallySelected}
        onSelectAll={onSelectAll}
      />
      <Separator />

      <div className="flex-1 overflow-y-auto">
        {Object.entries(report).map(([sectionName, section], index) => (
          <SectionItem
            key={sectionName}
            sectionName={sectionName}
            section={section}
            showSeparatorOnTop={index > 0}
            viewModel={viewModel}
            onToggleSection={onToggleSection}
            onToggleSectionExpansion={onToggleSectionExpansion}
          />
        ))}
      </div>
    </div>
  );
}
