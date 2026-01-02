import configStore from 'src/apps/main/config';

export function userHasBackupsEnabled(): boolean {
  const availableUserProducts = configStore.get('availableUserProducts');
  return !!availableUserProducts?.backups;
}
