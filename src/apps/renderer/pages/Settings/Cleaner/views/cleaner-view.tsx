import { useMemo, useState } from 'react';
import { CleanerReport } from '../mocks';
import { calculateChartSegments } from '../cleaner.service';
import SectionDetailMenu from '../components/section-detail-menu';
import { CleanupSizeIndicator } from '../components/cleanup-size-indicator';
import { SectionsList } from '../components/sections-list';
import { useCleanerViewModel } from '../hooks/useCleanerViewModel';

interface CleanerViewProps {
  report: CleanerReport;
  onCleanUp: () => void;
}

export function CleanerView({ report, onCleanUp }: CleanerViewProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sectionDetailMenu, setSectionDetailMenu] = useState<string | null>(
    null
  );

  const {
    viewModel,
    toggleSection,
    toggleItemSelection,
    selectAllSections,
    deselectAllSections,
    getSectionSelectionStats,
    getTotalSelectedSize,
    getGlobalSelectionStats,
  } = useCleanerViewModel();

  const totalSize = useMemo(() => {
    return Object.values(report).reduce(
      (sum, section) => sum + section.totalSizeInBytes,
      0
    );
  }, [report]);

  const selectedSize = useMemo(() => {
    return getTotalSelectedSize(report);
  }, [getTotalSelectedSize, report]);

  const toggleSectionExpansion = (sectionKey: string) => {
    setSectionDetailMenu((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const globalStats = useMemo(() => {
    return getGlobalSelectionStats(report);
  }, [getGlobalSelectionStats, report]);

  const selectAll = () => {
    if (globalStats.isAllSelected) {
      deselectAllSections();
    } else {
      selectAllSections();
    }
  };

  const handleCleanUp = () => {
    if (selectedSize > 0) {
      setShowConfirmDialog(true);
    }
  };

  const confirmCleanUp = () => {
    // onCleanUp(selectedItems);
    onCleanUp();
    setShowConfirmDialog(false);
  };

  const segmentDetails = useMemo(() => {
    return calculateChartSegments(
      viewModel,
      report,
      totalSize,
      getSectionSelectionStats
    );
  }, [viewModel, report, totalSize, getSectionSelectionStats]);

  return (
    <div className="relative flex h-full overflow-hidden rounded-lg border border-gray-10 bg-surface shadow-sm dark:bg-gray-5">
      {/* Main View */}
      <div className="flex h-full w-full">
        {/* Left Panel */}
        <SectionsList
          report={report}
          viewModel={viewModel}
          isAllSelected={globalStats.isAllSelected}
          isPartiallySelected={globalStats.isPartiallySelected}
          onSelectAll={selectAll}
          onToggleSection={toggleSection}
          onToggleSectionExpansion={toggleSectionExpansion}
        />
        {/* Right Panel */}
        <CleanupSizeIndicator
          selectedSize={selectedSize}
          totalSize={totalSize}
          segmentDetails={segmentDetails}
        />
      </div>
      {/* Section Detail Menu */}
      {sectionDetailMenu && (
        <SectionDetailMenu
          sectionName={sectionDetailMenu}
          report={report}
          viewModel={viewModel}
          onClose={() => setSectionDetailMenu(null)}
          onToggleSection={toggleSection}
          onToggleItem={toggleItemSelection}
        />
      )}
      {/* TODO Dialog */}
      {showConfirmDialog && <div>Todo implement confirm dialog</div>}
    </div>
  );
}
