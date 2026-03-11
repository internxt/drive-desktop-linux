import { Sparkle } from '@phosphor-icons/react';
import Button from '../../../../components/Button';
import { useTranslationContext } from '../../../../context/LocalContext';
import CleanedFilesContainer from './cleaned-files-containter';

type Props = {
  deletedFiles: number;
  skippedFiles: number;
  freeSpaceGained: string;
  onFinish: () => void;
};
export default function CleaningFinished({ deletedFiles, skippedFiles, freeSpaceGained, onFinish }: Props) {
  const { translate } = useTranslationContext();
  return (
    <div className="mb-[2px] flex w-full flex-col items-center gap-4" data-testid="clean-finished-container">
      <div className="flex w-full max-w-[450px] flex-col text-center">
        <div className="mb-3 flex justify-center">
          <Sparkle color="#0066ff" weight="fill" size={64} />
        </div>
        <h3 className="text-2xl font-semibold">
          {skippedFiles === 0
            ? translate('settings.cleaner.cleaningView.cleaningFinished.title')
            : translate('settings.cleaner.cleaningView.cleaningFinished.titleForSkippedFiles')}
        </h3>
        <p className="mt-1 whitespace-pre-line text-sm text-gray-70">
          {skippedFiles === 0
            ? translate('settings.cleaner.cleaningView.cleaningFinished.noActionsRequired')
            : translate('settings.cleaner.cleaningView.cleaningFinished.actionsRequired')}
        </p>
      </div>
      <CleanedFilesContainer
        deletedFiles={deletedFiles}
        skippedFiles={skippedFiles}
        freeSpaceGained={freeSpaceGained}
      />
      <Button className={'hover:cursor-pointer'} variant="primary" size="xl" onClick={onFinish}>
        {translate('settings.cleaner.cleaningView.cleaningFinished.finish')}
      </Button>
    </div>
  );
}
