import Header from './Header';
import SyncAction from './SyncAction';
import SyncErrorBanner from './SyncErrorBanner';
import SyncInfo from './SyncInfo';
import { useSyncContext } from '../../context/SyncContext';
import { SyncFailed } from './SyncFailed';
import { useEffect, useState } from 'react';
import useVirtualDriveStatus from '../../hooks/useVirtualDriveStatus';
import { VirtualDriveError } from './VirtualDriveError';
import { InfoBanners } from './InfoBanners/InfoBanners';
import { isClientVersionUnsupported } from '@internxt/drive-desktop-core/build/backend/features/client-compatibility/services/is-client-version-unsupported';
import { ClientCompatibilityBanner } from '@internxt/drive-desktop-core/build/frontend';
import { useClientCompatibility } from '../../hooks/useClientCompatibility';
import { useTranslationContext } from '../../context/LocalContext';
import { DEFAULT_LANGUAGE, isLanguage } from '../../../shared/Locale/Language';

const handleRetrySync = () => {
  window.electron.startRemoteSync().catch((err) => {
    window.electron.logger.error({
      msg: '[RENDERER] Failed to retry sync from widget',
      error: err,
    });
  });
};

export default function Widget() {
  const { syncStatus } = useSyncContext();
  const [displayErrorInWidget, setDisplayErrorInWidget] = useState(false);

  const { virtualDriveStatus } = useVirtualDriveStatus();
  const { language } = useTranslationContext();
  const clientCompatibility = useClientCompatibility();

  useEffect(() => {
    setDisplayErrorInWidget(syncStatus && syncStatus === 'FAILED');
  }, [syncStatus]);

  const banner = (
    <ClientCompatibilityBanner
      state={clientCompatibility.state}
      language={isLanguage(language) ? language : DEFAULT_LANGUAGE}
      onUpdate={() => void window.electron.updateApp()}
    />
  );

  /**
   * v2.7.1 Alexis Mora
   * An unsupported version only shows the update banner: the header dropdown is the way into preferences,
   * antivirus and cleaner, which must not run until the user updates.
   */
  if (isClientVersionUnsupported(clientCompatibility.state)) {
    return <div className="flex h-screen flex-col justify-center overflow-hidden">{banner}</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      {banner}
      {/* v2.7.1 Alexis Mora: the compatibility banner replaces the GitHub update banner so both do not show. */}
      <InfoBanners showUpdateAvailable={clientCompatibility.state.status === 'up_to_date'} />
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
