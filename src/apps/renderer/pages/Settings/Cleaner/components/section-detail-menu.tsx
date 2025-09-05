import { CleanerReport } from '../mocks';
import SectionDetailHeader from './section-detail-header';
import { Separator } from './Separator';
import { SectionDetailMenuItem } from './SectionDetailMenuItem';

type Props = {
  sectionName: string;
  report: CleanerReport;
  selectedItems: { [sectionKey: string]: string[] };
  onClose: () => void;
  onToggleSection: (sectionKey: string) => void;
  onToggleItem: (sectionKey: string, itemPath: string) => void;
};

export default function SectionDetailMenu({
  sectionName,
  report,
  selectedItems,
  onClose,
  onToggleSection,
  onToggleItem,
}: Props) {
  if (!sectionName) return <></>;
  
  const sectionData = report[sectionName as keyof CleanerReport];
  const selectedInSection = selectedItems[sectionName] || [];
  const isAllSelected = selectedInSection.length === sectionData.items.length;
  const isPartiallySelected = selectedInSection.length > 0 && selectedInSection.length < sectionData.items.length;
  
  const handleSelectAll = () => {
    onToggleSection(sectionName);
  };
  
  return (
    <div
      className={
        'absolute right-0 top-0 z-10 h-full transform border-l border-gray-10 bg-surface shadow-sm transition-transform duration-300 ease-in-out dark:bg-gray-5'
      }
      style={{ width: '75%' }}
    >
      <SectionDetailHeader 
        sectionName={sectionName} 
        onClose={onClose}
        isAllSelected={isAllSelected}
        isPartiallySelected={isPartiallySelected}
        onSelectAll={handleSelectAll}
      />
      <Separator classname="mx-2" />
      <div className="flex h-full flex-1 flex-col overflow-y-auto p-4">
        <div className="bg-space flex-1 overflow-y-auto rounded-lg dark:bg-gray-5">
          {report[sectionName as keyof CleanerReport].items.map(
            (item, index) => (
              <SectionDetailMenuItem
                key={item.fullPath}
                item={item}
                sectionName={sectionName}
                showSeparatorOnTop={index > 0}
                selectedItems={selectedItems}
                onToggleItem={onToggleItem}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
