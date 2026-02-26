import { useEffect, useMemo, useState } from 'react';
import { calculateChartSegments, formatFileSize } from '../cleaner.service';
import SectionDetailMenu from '../components/section-detail-menu';
import { CleanupSizeChart } from '../components/cleanup-size-chart';
import { SectionsList } from '../components/sections-list';
import { CleanerViewModelHook } from '../hooks/useCleanerViewModel';
import { CleanerReport } from '../../../../../../backend/features/cleaner/cleaner.types';
import { useCleaner } from '../../../../../renderer/context/CleanerContext';
import { useTranslationContext } from '../../../../context/LocalContext';

type CleanerViewProps = {
  report: CleanerReport;
} & CleanerViewModelHook;

export function CleanerView({
  report,
  viewModel,
  toggleSection,
  toggleItemSelection,
  selectAllSections,
  deselectAllSections,
  getSectionSelectionStats,
  getTotalSelectedSize,
  getGlobalSelectionStats,
}: CleanerViewProps) {
  const { diskSpace } = useCleaner();
  const { translate } = useTranslationContext();
  const [sectionDetailMenu, setSectionDetailMenu] = useState<string | null>(null);
  const [isDetailMenuOpen, setIsDetailMenuOpen] = useState(false);
  const [mountedSection, setMountedSection] = useState<string | null>(null);

  useEffect(() => {
    if (sectionDetailMenu) {
      setMountedSection(sectionDetailMenu);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsDetailMenuOpen(true);
        });
      });
    } else {
      setIsDetailMenuOpen(false);
    }
  }, [sectionDetailMenu]);

  const handleDetailMenuClose = () => {
    setSectionDetailMenu(null);
  };

  const handleTransitionEnd = () => {
    if (!isDetailMenuOpen) {
      setMountedSection(null);
    }
  };

  const totalSize = useMemo(() => {
    return Object.values(report).reduce((sum, section) => sum + section.totalSizeInBytes, 0);
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

  const segmentDetails = useMemo(() => {
    return calculateChartSegments(viewModel, report, totalSize, getSectionSelectionStats);
  }, [viewModel, report, totalSize, getSectionSelectionStats]);

  return (
    <div className="relative flex h-full overflow-hidden rounded-lg border border-gray-10 bg-surface shadow-sm dark:bg-gray-1">
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
        <div className="relative flex w-[44%] flex-col items-center justify-start bg-surface pt-4 dark:bg-gray-1">
          <div className="absolute left-0 top-1/2 h-[90%] w-px -translate-y-1/2 bg-gray-10" />
          <div className="mb-8 w-full text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg font-normal leading-tight">
              {translate('settings.cleaner.sizeIndicatorView.selectCategory')}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-normal leading-tight">
              {translate('settings.cleaner.sizeIndicatorView.previewContent')}
            </p>
          </div>

          <div className="mb-8 mt-1">
            <CleanupSizeChart
              className="relative h-36 w-64"
              segmentDetails={segmentDetails}
              totalSize={diskSpace}
              selectedSize={selectedSize}
              formattedSelectedSize={formatFileSize(selectedSize)}
              saveUpToLabel={translate('settings.cleaner.sizeIndicatorView.saveUpTo')}
              ofYourSpaceLabel={translate('settings.cleaner.sizeIndicatorView.ofYourSpace')}
            />
          </div>
        </div>
      </div>
      {/* Section Detail Menu */}
      {mountedSection && (
        <SectionDetailMenu
          sectionName={mountedSection}
          report={report}
          viewModel={viewModel}
          isOpen={isDetailMenuOpen}
          onClose={handleDetailMenuClose}
          onTransitionEnd={handleTransitionEnd}
          onToggleSection={toggleSection}
          onToggleItem={toggleItemSelection}
        />
      )}
    </div>
  );
}
