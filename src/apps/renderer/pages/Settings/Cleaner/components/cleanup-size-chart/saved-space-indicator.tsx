type Props = {
  totalSize: number;
  selectedSize: number;
  saveUpToLabel: string;
  ofYourSpaceLabel: string;
};

export function SavedSpaceIndicator({ totalSize, selectedSize, saveUpToLabel, ofYourSpaceLabel }: Props) {
  const savedSpacePercentage = totalSize > 0 ? ((selectedSize / totalSize) * 100).toFixed(2) : '0.00';

  return (
    <div className="text-gray-500 dark:text-gray-400 mt-1 text-center text-xs">
      {saveUpToLabel} {savedSpacePercentage}%
      <br />
      {ofYourSpaceLabel}
    </div>
  );
}
