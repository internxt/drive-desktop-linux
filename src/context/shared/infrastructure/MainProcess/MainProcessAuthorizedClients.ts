import { AuthorizedClients } from '../../../../apps/shared/HttpClient/Clients';
import { getClients } from '../../../../apps/shared/HttpClient/main-process-client';

export class MainProcessAuthorizedClients implements AuthorizedClients {
  public newDrive: AuthorizedClients['newDrive'];

  constructor() {
    const { newDrive } = getClients();
    this.newDrive = newDrive;
  }
}
