import { AuthorizedClients } from '../../../../apps/shared/HttpClient/Clients';
import { getClients } from '../../../../apps/shared/HttpClient/background-process-clients';

export class BackgroundProcessAuthorizedClients implements AuthorizedClients {
  public newDrive: AuthorizedClients['newDrive'];

  constructor() {
    const { newDrive } = getClients();
    this.newDrive = newDrive;
  }
}
