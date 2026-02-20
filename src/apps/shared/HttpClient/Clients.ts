import { Axios } from 'axios';

export abstract class AuthorizedClients {
  abstract newDrive: Axios;
}
