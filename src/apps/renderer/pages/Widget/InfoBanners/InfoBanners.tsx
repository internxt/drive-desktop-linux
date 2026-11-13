import { DiscoverBackups } from './Banners/DiscoverBackups';
import { NautilusUnavailable } from './Banners/NautilusUnavailable';
import { UpdateAvailable } from './Banners/UpdateAvailable';

type Props = {
  showUpdateAvailable: boolean;
};

export function InfoBanners({ showUpdateAvailable }: Readonly<Props>) {
  return (
    <>
      <NautilusUnavailable />
      {showUpdateAvailable && <UpdateAvailable />}
      <DiscoverBackups />
    </>
  );
}
