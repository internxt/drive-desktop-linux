import configStore from '../../../../apps/main/config';

export function isMailBridgeStartOnLoginEnabled(): boolean {
  return configStore.get('mailBridgeStartOnLogin');
}
