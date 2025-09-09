import { useCleaner } from '../../../context/CleanerContext';
import Button from '../../../components/Button';
import { handleCleanup } from './cleaner.service';
import { mockCleanerData } from './mocks';
import { CleanerView } from './views/cleaner-view';
import { GenerateReportView } from './views/generate-report-view';
import { LoadingView } from './views/loading-view';
import { useTranslationContext } from '../../../context/LocalContext';

type Props = {
  active: boolean;
};
export function CleanerSection({ active }: Props) {
  const { translate } = useTranslationContext();
  const { report, loading, generateReport } = useCleaner();
  return (
    <section
      className={`${active ? 'block' : 'hidden'} relative h-full w-full`}
    >
      <div className="flex h-full w-full flex-col gap-4">
        {!report && !loading && (
          <>
            <GenerateReportView onGenerateReport={generateReport} />
          </>
        )}
        {loading && <LoadingView />}
        {report && (
          <>
            <div className="flex-1">
              <CleanerView report={mockCleanerData} onCleanUp={handleCleanup} />
            </div>
            <div className="flex justify-center">
              <Button
                className={'hover:cursor-pointer'}
                variant={'primary'}
                size="md"
                onClick={handleCleanup}
              >
                {translate('settings.cleaner.mainView.cleanup')}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
