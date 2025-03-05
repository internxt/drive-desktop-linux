import { Storage } from '@internxt/sdk/dist/drive/storage';
import { Trash } from '@internxt/sdk/dist/drive/trash';
import { onUserUnauthorized } from '../../HttpClient/background-process-clients';
import packageJson from '../../../../../package.json';
import { obtainToken } from '../../../main/auth/service';
import Logger from 'electron-log';
// Create a safer unauthorized callback that doesn't rely on emit
const safeUnauthorizedCallback = () => {
  Logger.warn('Unauthorized request detected - token may have expired');
  // You could add logic here to refresh the token if needed
  // Or simply log the issue without trying to emit an event
};

export class DependencyInjectionMainProcessSdk {
  private static storageSdk: Storage;
  private static trashSdk: Trash;

  static async getStorage(): Promise<any> {
    if (this.storageSdk) {
      return this.storageSdk;
    }

    const url = `${process.env.API_URL}`;
    const { name: clientName, version: clientVersion } = packageJson;
    const token = obtainToken('bearerToken');

    const sdk = Storage.client(
      url,
      {
        clientName,
        clientVersion,
      },
      {
        token,
        unauthorizedCallback: onUserUnauthorized,
      }
    );

    this.storageSdk = sdk;
    return this.storageSdk;
  }

  static async getTrash(): Promise<any> {
    if (this.trashSdk) {
      return this.trashSdk;
    }

    const url = `${process.env.NEW_DRIVE_URL}`;
    const { name: clientName, version: clientVersion } = packageJson;
    const token = obtainToken('newToken');

    const sdk = Trash.client(
      url,
      {
        clientName,
        clientVersion,
      },
      {
        token,
        unauthorizedCallback: safeUnauthorizedCallback,
      }
    );

    this.trashSdk = sdk;
    return this.trashSdk;
  }
}
