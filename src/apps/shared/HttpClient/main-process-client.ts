/*TODO: DELETE DEAD CODE */
import { Axios } from 'axios';

import { onUserUnauthorized } from '../../main/auth/handlers';
import { getNewApiHeaders } from '../../main/auth/service';
import { AuthorizedClients } from './Clients';
import { AuthorizedHttpClient } from './AuthorizedHttpClient';

const newHeadersProvider = () => Promise.resolve(getNewApiHeaders());

let newClient: AuthorizedHttpClient | null = null;

export function getNewTokenClient(): Axios {
  if (!newClient) {
    newClient = new AuthorizedHttpClient(newHeadersProvider, onUserUnauthorized);
  }

  return newClient.client;
}

export function getClients(): AuthorizedClients {
  return {
    newDrive: getNewTokenClient(),
  };
}
