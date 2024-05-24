import { ReactNode, useContext, useState } from 'react';
import { DeviceContext } from '../../../context/DeviceContext';
import Spinner from '../../../assets/spinner.svg';
import BackupsList from './List';
import BackupsSetting from './BackupsSetting';

export default function BackupsSection({ active }: { active: boolean }) {
  const [subsection, setSubsection] = useState<'panel' | 'list'>('panel');

  const [deviceState] = useContext(DeviceContext);

  let content: ReactNode;

  if (deviceState.status === 'LOADING')
    content = (
      <div className="flex h-32 items-center justify-center">
        <Spinner className=" fill-neutral-500 h-9 w-9 animate-spin" />
      </div>
    );
  else if (deviceState.status === 'ERROR')
    content = (
      <div className="flex h-32 items-center justify-center">
        <p className="text-red-60 text-sm">
          There was an error loading your backups
        </p>
      </div>
    );
  else
    content = (
      <>
        {subsection === 'panel' && (
          <BackupsSetting onGoToList={() => setSubsection('list')} />
        )}
        {subsection === 'list' && (
          <BackupsList onGoToPanel={() => setSubsection('panel')} />
        )}
      </>
    );

  return <div className={active ? 'block' : 'hidden'}>{content}</div>;
}
