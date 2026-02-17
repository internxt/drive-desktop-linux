import { useTranslationContext } from '../../../../context/LocalContext';
import { formatFileSize } from '../cleaner.service';

type Props = {
  selectedSize: number;
  totalSize: number;
  segmentDetails: Array<{ color: string; percentage: number; size: number }>;
};
export function CleanupSizeIndicator({ selectedSize, totalSize, segmentDetails }: Props) {
  const { translate } = useTranslationContext();
  return (
    <div className="relative flex w-[44%] flex-col items-center justify-start bg-surface pt-2 dark:bg-gray-1">
      <div className="absolute left-0 top-1/2 h-[90%] w-px -translate-y-1/2 bg-gray-10" />
      <div className="mb-8 w-full text-center">
        <p className="text-gray-500 dark:text-gray-400 text-lg font-normal leading-tight">
          {translate('settings.cleaner.sizeIndicatorView.selectCategory')}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-normal leading-tight">
          {translate('settings.cleaner.sizeIndicatorView.previewContent')}
        </p>
      </div>

      <div className="relative mb-8 h-36 w-64">
        <svg className="h-full w-full" viewBox="0 0 200 100">
          <path
            d="M 20 80 A 80 80 0 0 1 180 80"
            fill="none"
            stroke="#E5E7EB"
            className="dark:stroke-gray-600"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {segmentDetails.length > 0 && (
            <>
              {
                segmentDetails.reduce(
                  (acc, segment, index) => {
                    const radius = 80;
                    const circumference = Math.PI * radius;
                    const strokeLength = (segment.percentage / 100) * circumference;
                    const strokeDasharray = `${strokeLength} ${circumference}`;
                    const strokeDashoffset = -acc.offset;

                    acc.elements.push(
                      <path
                        key={index}
                        d="M 20 80 A 80 80 0 0 1 180 80"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 ease-in-out"
                      />,
                    );

                    acc.offset += strokeLength;
                    return acc;
                  },
                  { elements: [] as React.ReactNode[], offset: 0 },
                ).elements
              }
            </>
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
          <div className="text-gray-900 text-3xl font-bold dark:text-gray-100">{formatFileSize(selectedSize)}</div>
          <SavedSpaceIndicator totalSize={totalSize} selectedSize={selectedSize} />
        </div>
      </div>
    </div>
  );
}

function SavedSpaceIndicator({ totalSize, selectedSize }: { totalSize: number; selectedSize: number }) {
  const { translate } = useTranslationContext();
  const savedSpacePercentage = totalSize > 0 ? ((selectedSize / totalSize) * 100).toFixed(2) : '0.00';

  return (
    <div className="text-gray-500 dark:text-gray-400 mt-1 text-center text-sm">
      {translate('settings.cleaner.sizeIndicatorView.saveUpTo')} {savedSpacePercentage}%
      <br />
      {translate('settings.cleaner.sizeIndicatorView.ofYourSpace')}
    </div>
  );
}
