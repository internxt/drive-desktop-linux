import Button from '../../../../components/Button';

interface ScanProcessProps {
  currentScanPath?: string;
  stopScanProcess: () => void;
  scannedProcess: number;
  translate: (key: string, keysToReplace?: Record<string, string | number>) => string;
}

export const ScanProcess = ({ currentScanPath, scannedProcess, stopScanProcess, translate }: ScanProcessProps) => {
  const isCountingFiles = !currentScanPath;

  return (
    <div className="flex w-full flex-col items-center gap-4" data-testid="scan-process-container">
      <div className="flex h-20 w-full max-w-[450px] flex-col text-center">
        <p>
          {translate(
            isCountingFiles ? 'settings.antivirus.scanProcess.counting' : 'settings.antivirus.scanProcess.scanning',
          )}
        </p>
        <p className="line-clamp-2">
          {isCountingFiles ? translate('settings.antivirus.scanProcess.countingDetail') : currentScanPath}
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
          {isCountingFiles ? (
            <div
              data-testid="counting-progress"
              className="h-full w-full [animation:antivirus-count-stripes_1s_infinite_linear] rounded-full bg-primary"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, rgb(255 255 255 / 0.25) 25%, transparent 25%, transparent 50%, rgb(255 255 255 / 0.25) 50%, rgb(255 255 255 / 0.25) 75%, transparent 75%, transparent)',
                backgroundSize: '1rem 1rem',
              }}
            />
          ) : (
            <div
              className="flex h-full rounded-full bg-primary"
              style={{
                width: `${scannedProcess}%`,
              }}
            />
          )}
        </div>
        <p>{isCountingFiles ? null : `${scannedProcess}%`}</p>
      </div>
      <Button variant="danger" onClick={stopScanProcess}>
        {translate('settings.antivirus.scanOptions.stopScan')}
      </Button>
      {isCountingFiles && (
        <style>
          {`@keyframes antivirus-count-stripes {
            from { background-position: 0 0; }
            to { background-position: 1rem 0; }
          }`}
        </style>
      )}
    </div>
  );
};
