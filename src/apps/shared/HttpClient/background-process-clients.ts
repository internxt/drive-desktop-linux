import { ipcRenderer } from 'electron';
import { AuthorizedHttpClient } from './AuthorizedHttpClient';
import { AuthorizedClients } from './Clients';

export const onUserUnauthorized = () => ipcRenderer.emit('user-is-unauthorized');

const newDriveHeadersProvider = () => ipcRenderer.invoke('get-headers-for-new-api');
let clients: AuthorizedClients | null = null;

export function getClients(): AuthorizedClients {
  if (!clients) {
    clients = {
      newDrive: new AuthorizedHttpClient(newDriveHeadersProvider, onUserUnauthorized).client,
    };
  }

  return clients;
}
