import { useContext } from 'react';
import { DeviceContext } from '../../../context/DeviceContext';
import { DeviceSettings } from './DeviceSettings';
import { DevicesSideBar } from './DevicesSideBar';

import Spinner from '../../../assets/spinner.svg';

interface BackupsSectionProps {
  active: boolean;
  showBackedFolders: () => void;
}

export default function BackupsSection({
  active,
  showBackedFolders,
}: BackupsSectionProps) {
  const [deviceState] = useContext(DeviceContext);

  return (
    <div className={active ? 'block' : 'hidden'}>
      {deviceState.status === 'LOADING' && (
        <div className="flex h-32 items-center justify-center">
          <Spinner className=" fill-neutral-500 h-9 w-9 animate-spin" />
        </div>
      )}
      {deviceState.status === 'ERROR' && (
        <div className="flex h-32 items-center justify-center">
          <p className="text-red-60 text-sm">
            There was an error loading your backups
          </p>
        </div>
      )}
      {deviceState.status === 'SUCCESS' && (
        <section className="flex h-full">
          <DevicesSideBar className="w-1/3" />
          <div className="mx-2 border-l border-gray-10"></div>
          <DeviceSettings className="w-2/3" onGoToList={showBackedFolders} />
        </section>
      )}
    </div>
  );
}
