import { IpcMainInvokeEvent } from 'electron';
import { driveServerModule } from '../drive-server/drive-server.module';
import { AuthIPCMain } from './auth-ipc-main';
import { AuthLoginResponseViewModel } from '../drive-server/services/auth/auth.types';

export function registerAuthIPCHandlers(): void {
  AuthIPCMain.handle(
    'auth:login',
    async (_event: IpcMainInvokeEvent, email: string) => {
      const response = await driveServerModule.auth.login(email);
      return response.fold<AuthLoginResponseViewModel>(
        (err) => ({ success: false, error: err.message }),
        (data) => ({ success: true, data })
      );
    }
  );
}
