import { useCleaner } from '../../../../context/CleanerContext';
import CleaningFinished from '../components/cleaning-finished';
import CleaningProcess from '../components/cleaning-process';

export default function CleaningView() {
  const { cleaningState, generateReport, stopCleanup, setInitialCleaningState } = useCleaner();
  function handleStopCleaning() {
    stopCleanup();
  }

  function handleFinishView() {
    setInitialCleaningState();
    generateReport(true);
  }
  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="flex w-full max-w-[590px] flex-col items-center justify-center gap-4 p-5">
          {cleaningState.cleaning && (
            <CleaningProcess
              currentCleaningPath={cleaningState.currentCleaningPath}
              cleanedProgress={cleaningState.progress}
              deletedFiles={cleaningState.deletedFiles}
              skippedFiles={cleaningState.skippedFiles}
              freeSpaceGained={cleaningState.spaceGained}
              onStopCleaning={handleStopCleaning}
            />
          )}
          {cleaningState.cleaningCompleted && !cleaningState.cleaning && (
            <CleaningFinished
              deletedFiles={cleaningState.deletedFiles}
              skippedFiles={cleaningState.skippedFiles}
              freeSpaceGained={cleaningState.spaceGained}
              onFinish={handleFinishView}
            />
          )}
        </div>
      </div>
    </>
  );
}
