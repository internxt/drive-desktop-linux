// import { LoadingState } from '../Antivirus/views/LoadingState';

import Button from '../../../components/Button';
import { handleCleanup } from './cleaner.service';
import { mockCleanerData } from './mocks';
import { CleanerView } from './views/cleaner-view';

type Props = {
  active: boolean;
};
export function CleanerSection({ active }: Props) {
  return (
    <section
      className={`${active ? 'block' : 'hidden'} relative h-full w-full`}
    >
      <div className="flex h-full w-full flex-col gap-4">
        {/* <LoadingState /> */}
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
            Clean Up
          </Button>
        </div>
      </div>
    </section>
  );
}
