import { useTranslationContext } from '../../../../context/LocalContext';
import { SkippedFilesCounter } from './skiped-files-counter';

type Props = {
  deletedFiles: number;
  skippedFiles?: number;
  freeSpaceGained: string;
};
export default function CleanedFilesContainer({ deletedFiles, skippedFiles = 0, freeSpaceGained }: Props) {
  const { translate } = useTranslationContext();
  const showSkippedFiles = skippedFiles > 0;

  return (
    <div className={`flex h-[70px] items-stretch gap-5 rounded-xl border border-gray-10 px-5 py-2 ${showSkippedFiles ? 'w-[540px]' : 'w-[352px]'}`}>
      <div className="flex w-full flex-row justify-center gap-5">
        <div className="flex w-full max-w-[248px] flex-col items-center justify-center text-center">
          <p className="mb-0.5 text-lg font-medium leading-tight text-gray-100">{deletedFiles}</p>
          <p className="leading-tight text-gray-80">
            {translate('settings.cleaner.cleaningView.cleaningProcess.deletedFiles')}
          </p>
        </div>
        <div className="flex flex-col border border-gray-10" />
        <SkippedFilesCounter skippedFiles={skippedFiles} show={showSkippedFiles} />
        <div className="flex w-full max-w-[248px] flex-col items-center justify-center text-center">
          <p className="mb-0.5 text-lg font-medium leading-tight text-gray-100">{freeSpaceGained}</p>
          <p className="leading-tight text-gray-80">
            {translate('settings.cleaner.cleaningView.cleaningProcess.freeSpaceGained')}
          </p>
        </div>
      </div>
    </div>
  );
}
