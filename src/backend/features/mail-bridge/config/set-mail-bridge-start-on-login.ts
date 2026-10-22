import configStore from '../../../../apps/main/config';

export function setMailBridgeStartOnLogin(enabled: boolean): void {
  configStore.set('mailBridgeStartOnLogin', enabled);
}
