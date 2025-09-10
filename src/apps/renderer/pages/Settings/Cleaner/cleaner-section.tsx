import { useState } from 'react';
import { useCleaner } from '../../../context/CleanerContext';
import Button from '../../../components/Button';
import { handleCleanup } from './cleaner.service';
import { CleanerView } from './views/cleaner-view';
import { GenerateReportView } from './views/generate-report-view';
import { LoadingView } from './views/loading-view';
import { CleanupConfirmDialog } from './components/CleanupConfirmDialog';
import { useTranslationContext } from '../../../context/LocalContext';
import { useCleanerViewModel } from './hooks/useCleanerViewModel';

type Props = {
  active: boolean;
};
export function CleanerSection({ active }: Props) {
  const { translate } = useTranslationContext();
  const { loading, report, generateReport } = useCleaner();
  const useCleanerViewModelHook = useCleanerViewModel();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleCleanupClick = () => {
    setShowConfirmDialog(true);
  };

  const confirmCleanup = () => {
    if (report) {
      handleCleanup(useCleanerViewModelHook.viewModel, report);
    }
    setShowConfirmDialog(false);
  };

  const cancelCleanup = () => {
    setShowConfirmDialog(false);
  };
  return (
    <section
      className={`${active ? 'block' : 'hidden'} relative h-full w-full`}
    >
      <div className="flex h-full w-full flex-col gap-4">
        {!report && !loading && (
          <>
            <GenerateReportView
              onGenerateReport={generateReport}
              {...useCleanerViewModelHook}
            />
          </>
        )}
        {loading && <LoadingView />}
        {report && (
          <>
            <div className="flex-1">
              <CleanerView report={report} {...useCleanerViewModelHook} />
            </div>
            <div className="flex justify-center">
              <Button
                className={'hover:cursor-pointer'}
                variant={'primary'}
                size="md"
                onClick={handleCleanupClick}
              >
                {translate('settings.cleaner.mainView.cleanup')}
              </Button>
            </div>
          </>
        )}
      </div>
      <CleanupConfirmDialog
        isVisible={showConfirmDialog}
        onConfirm={confirmCleanup}
        onCancel={cancelCleanup}
      />
    </section>
  );
}
