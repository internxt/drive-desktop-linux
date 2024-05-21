import { Service } from 'diod';
import { RemoteItemsGenerator } from '../domain/RemoteItemsGenerator';
import { ServerFile } from '../../../shared/domain/ServerFile';
import { ServerFolder } from '../../../shared/domain/ServerFolder';
import { AuthorizedClients } from '../../../../apps/shared/HttpClient/Clients';

@Service()
export class BackupItemsGenerators implements RemoteItemsGenerator {
  constructor(private readonly httpClients: AuthorizedClients) {}

  async getAll(): Promise<{ files: ServerFile[]; folders: ServerFolder[] }> {
    const PAGE_SIZE = 5000;

    let thereIsMore = true;
    let offset = 0;

    const files: ServerFile[] = [];
    const folders: ServerFolder[] = [];

    while (thereIsMore) {
      // eslint-disable-next-line no-await-in-loop
      const batch = await this.httpClients.drive.get(
        `${process.env.API_URL}/api/desktop/list/${offset}`
      );

      const { files, folders } = batch.data;

      // We can't use spread operator with big arrays
      // see: https://anchortagdev.com/range-error-maximum-call-stack-size-exceeded-error-using-spread-operator-in-node-js-javascript/
      for (const file of files) files.push(file);

      for (const folder of folders) folders.push(folder);

      thereIsMore = folders.length === PAGE_SIZE;

      if (thereIsMore) offset += PAGE_SIZE;
    }

    return { files, folders };
  }
}
