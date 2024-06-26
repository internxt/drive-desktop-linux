import Header from './Header';
import SyncAction from './SyncAction';
import SyncErrorBanner from './SyncErrorBanner';
import SyncInfo from './SyncInfo';
import useSyncStatus from '../../hooks/useSyncStatus';
import { SyncFailed } from './SyncFailed';
import { useEffect, useState } from 'react';
import useVirtualDriveStatus from '../../hooks/useVirtualDriveStatus';
import { VirtualDriveError } from './VirtualDriveError';
import { InfoBanners } from './InfoBanners/InfoBanners';

const handleRetrySync = () => {
  window.electron.startRemoteSync().catch((err) => {
    reportError(err);
  });
};

export default function Widget() {
  const { syncStatus } = useSyncStatus();
  const [displayErrorInWidget, setDisplayErrorInWidget] = useState(false);

  const { virtualDriveStatus } = useVirtualDriveStatus();

  useEffect(() => {
    setDisplayErrorInWidget(syncStatus && syncStatus === 'FAILED');
  }, [syncStatus]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <InfoBanners />
      {virtualDriveStatus === 'ERROR' ? (
        <VirtualDriveError />
      ) : (
        <>
          <SyncErrorBanner />
          {displayErrorInWidget && <SyncFailed onRetrySync={handleRetrySync} />}
          {!displayErrorInWidget && <SyncInfo />}
          <SyncAction syncStatus={syncStatus} />
        </>
      )}
    </div>
  );
}
