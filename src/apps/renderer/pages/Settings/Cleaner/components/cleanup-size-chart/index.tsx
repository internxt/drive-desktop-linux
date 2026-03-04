import { useMemo } from 'react';
import { calculateChartSegments } from './service';
import { ChartSegment, DEFAULT_GEOMETRY, SemicircleGeometry } from './types';
import { SavedSpaceIndicator } from './saved-space-indicator';

export type Props = {
  segmentDetails: ChartSegment[];
  geometryProps?: Partial<SemicircleGeometry>;
  unselectedColor?: string;
  className: string;
  totalSize: number;
  selectedSize: number;
  formattedSelectedSize: string;
  saveUpToLabel: string;
  ofYourSpaceLabel: string;
};

export function CleanupSizeChart({
  segmentDetails,
  geometryProps,
  unselectedColor = '#B7C5D7',
  className,
  totalSize,
  selectedSize,
  formattedSelectedSize,
  saveUpToLabel,
  ofYourSpaceLabel,
}: Props) {
  const segments = useMemo(() => {
    const geometry = { ...DEFAULT_GEOMETRY, ...geometryProps };
    return calculateChartSegments({ segments: segmentDetails, geometry });
  }, [segmentDetails, geometryProps]);

  return (
    <div className={className}>
      <svg className="h-full w-full" viewBox="0 0 200 100" overflow="visible">
        {segments.map((segment, i) => (
          <path
            key={i}
            d={segment.path}
            fill={segment.selected ? segment.color : unselectedColor}
            className="transition-all duration-500 ease-in-out"
          />
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <div className="text-gray-900 text-3xl font-bold dark:text-gray-100">{formattedSelectedSize}</div>
        <SavedSpaceIndicator
          totalSize={totalSize}
          selectedSize={selectedSize}
          saveUpToLabel={saveUpToLabel}
          ofYourSpaceLabel={ofYourSpaceLabel}
        />
      </div>
    </div>
  );
}
