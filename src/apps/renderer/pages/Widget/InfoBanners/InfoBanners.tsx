import { DiscoverBackups } from './Banners/DiscoverBackups';
import { UpdateAvailable } from './Banners/UpdateAvailable';

export function InfoBanners() {
  return (
    <>
      <UpdateAvailable />
      <DiscoverBackups />
    </>
  );
}
