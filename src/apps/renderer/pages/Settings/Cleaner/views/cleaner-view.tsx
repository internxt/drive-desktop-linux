import { useMemo, useState } from 'react';
import { CleanerReport } from '../mocks';
import { sectionConfig } from '../cleaner.service';
import SectionDetailMenu from '../components/section-detail-menu';
import { CleanupSizeIndicator } from '../components/cleanup-size-indicator';
import { SectionsList } from '../components/sections-list';

interface CleanerViewProps {
  report: CleanerReport;
  onCleanUp: () => void;
}

export function CleanerView({ report, onCleanUp }: CleanerViewProps) {
  const [selectedItems, setSelectedItems] = useState<{
    [sectionKey: string]: string[];
  }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sectionDetailMenu, setSectionDetailMenu] = useState<string | null>(
    null
  );

  const totalSize = useMemo(() => {
    return Object.values(report).reduce(
      (sum, section) => sum + section.totalSizeInBytes,
      0
    );
  }, [report]);

  const selectedSize = useMemo(() => {
    let size = 0;
    Object.entries(selectedItems).forEach(([sectionKey, itemPaths]) => {
      const section = report[sectionKey as keyof CleanerReport];
      itemPaths.forEach((path) => {
        const item = section.items.find((item) => item.fullPath === path);
        if (item) size += item.sizeInBytes;
      });
    });
    return size;
  }, [selectedItems, report]);

  const toggleSection = (sectionKey: string) => {
    const section = report[sectionKey as keyof CleanerReport];
    const currentSelected = selectedItems[sectionKey] || [];

    if (currentSelected.length === section.items.length) {
      setSelectedItems((prev) => ({ ...prev, [sectionKey]: [] }));
    } else {
      setSelectedItems((prev) => ({
        ...prev,
        [sectionKey]: section.items.map((item) => item.fullPath),
      }));
    }
  };

  const toggleItem = (sectionKey: string, itemPath: string) => {
    setSelectedItems((prev) => {
      const currentSelected = prev[sectionKey] || [];
      const isSelected = currentSelected.includes(itemPath);

      if (isSelected) {
        return {
          ...prev,
          [sectionKey]: currentSelected.filter((path) => path !== itemPath),
        };
      } else {
        return { ...prev, [sectionKey]: [...currentSelected, itemPath] };
      }
    });
  };

  const toggleSectionExpansion = (sectionKey: string) => {
    if (!sectionDetailMenu) {
      setSectionDetailMenu(sectionKey);
    } else if (sectionDetailMenu === sectionKey) {
      setSectionDetailMenu(null);
    } else {
      setSectionDetailMenu(sectionKey);
    }
  };

  const isAllSelected = useMemo(() => {
    return Object.entries(report).every(([sectionKey, section]) => {
      const selectedInSection = selectedItems[sectionKey] || [];
      return selectedInSection.length === section.items.length;
    });
  }, [selectedItems, report]);

  const isPartiallySelected = useMemo(() => {
    return (
      Object.values(selectedItems).some((items) => items.length > 0) &&
      !isAllSelected
    );
  }, [selectedItems, isAllSelected]);

  const selectAll = () => {
    if (isAllSelected) {
      setSelectedItems({});
    } else {
      const allSelected: { [sectionKey: string]: string[] } = {};
      Object.entries(report).forEach(([sectionKey, section]) => {
        allSelected[sectionKey] = section.items.map((item) => item.fullPath);
      });
      setSelectedItems(allSelected);
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
    const segments: Array<{ color: string; percentage: number; size: number }> =
      [];

    Object.entries(report).forEach(([sectionKey, section]) => {
      const selectedInSection = selectedItems[sectionKey] || [];
      const sectionSelectedSize = selectedInSection.reduce((sum, path) => {
        const item = section.items.find((item) => item.fullPath === path);
        return sum + (item?.sizeInBytes || 0);
      }, 0);

      if (sectionSelectedSize > 0) {
        segments.push({
          color: sectionConfig[sectionKey as keyof typeof sectionConfig].color,
          percentage: (sectionSelectedSize / totalSize) * 100,
          size: sectionSelectedSize,
        });
      }
    });

    return segments;
  }, [selectedItems, report, totalSize]);

  return (
    <div className="relative flex h-full overflow-hidden rounded-lg border border-gray-10 bg-surface shadow-sm dark:bg-gray-5">
      {/* Main View */}
      <div className="flex h-full w-full">
        {/* Left Panel */}
        <SectionsList
          report={report}
          selectedSize={selectedSize}
          selectedItems={selectedItems}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          onSelectAll={selectAll}
          onToggleSection={toggleSection}
          onToggleSectionExpansion={toggleSectionExpansion}
          onCleanUp={handleCleanUp}
        />
        {/* Right Panel */}
        <CleanupSizeIndicator
          selectedSize={selectedSize}
          totalSize={totalSize}
          segmentDetails={segmentDetails}
          report={report}
          selectedItems={selectedItems}
        />
      </div>
      {/* Section Detail Menu */}
      {sectionDetailMenu && (
        <SectionDetailMenu
          sectionName={sectionDetailMenu}
          report={report}
          selectedItems={selectedItems}
          onClose={() => setSectionDetailMenu(null)}
          onToggleSection={toggleSection}
          onToggleItem={toggleItem}
        />
      )}
      {/* TODO Dialog */}
      {showConfirmDialog && <div>Todo implement confirm dialog</div>}
    </div>
  );
}
