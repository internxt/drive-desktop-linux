import { app } from 'electron';
import { join, resolve } from 'node:path';
import {
  createMailBridgeStateDirectory,
  spawnMailBridge,
  type MailBridgePlatform,
} from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { PATHS } from '../../../../core/electron/paths';
import { getMailBridgeProcessEnvironment } from '../mail-bridge-config';
import { createControlEndpoint, removeControlDirectory } from '../utils/create-control-endpoint';

/** Linux paths and socket operations consumed by the shared bridge lifecycle. */
export const linuxMailBridgePlatform: MailBridgePlatform = {
  createControlEndpoint,
  removeControlEndpoint: removeControlDirectory,
  createMailBridgeStateDirectory: (accountId) =>
    createMailBridgeStateDirectory({ baseDirectory: PATHS.INTERNXT, accountId }),
  spawnMailBridge: ({ endpoint, stateDirectory }) => {
    try {
      const environment = getMailBridgeProcessEnvironment();
      if (environment.error) return Result.err(environment.error);
      return spawnMailBridge({
        ...resolveMailBridgeRuntime(),
        endpoint,
        stateDirectory,
        environment: environment.data,
      });
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('Could not start Mail Bridge'));
    }
  },
};

function resolveMailBridgeRuntime(): { executablePath: string; workingDirectory?: string } {
  if (app.isPackaged) {
    return { executablePath: join(process.resourcesPath, 'mail-bridge', 'mail-bridge') };
  }
  const workingDirectory = resolve(process.cwd(), '.mail-bridge');
  return { executablePath: join(workingDirectory, 'mail-bridge'), workingDirectory };
}
