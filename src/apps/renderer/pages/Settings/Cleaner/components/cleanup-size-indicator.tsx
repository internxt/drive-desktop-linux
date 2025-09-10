import { formatFileSize } from '../cleaner.service';

type Props = {
  selectedSize: number;
  totalSize: number;
  segmentDetails: Array<{ color: string; percentage: number; size: number }>;
};
export function CleanupSizeIndicator({
  selectedSize,
  totalSize,
  segmentDetails,
}: Props) {
  return (
    <div className="flex w-1/2 flex-col items-center justify-center bg-surface p-6 dark:bg-gray-5">
      <div className="mb-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
          Select a category to
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          preview content
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
                    const strokeLength =
                      (segment.percentage / 100) * circumference;
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
                      />
                    );

                    acc.offset += strokeLength;
                    return acc;
                  },
                  { elements: [] as React.ReactNode[], offset: 0 }
                ).elements
              }
            </>
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
          <div className="text-gray-900 text-3xl font-bold dark:text-gray-100">
            {formatFileSize(selectedSize)}
          </div>
          <div className="text-gray-500 dark:text-gray-400 mt-1 text-center text-sm">
            Save up to
            {totalSize > 0 ? Math.round((selectedSize / totalSize) * 100) : 0}%
            <br />
            of your space
          </div>
        </div>
      </div>
    </div>
  );
}
