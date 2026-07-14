import { logger } from '@internxt/drive-desktop-core/build/backend';
import { setupAntivirusIpc } from './setupAntivirusIPC';
import { getAntivirusManager } from '../../antivirus/antivirusManager';

let removeAntivirusIpcHandlers: (() => void) | null = null;

export async function trySetupAntivirusIpcAndInitialize() {
  if (process.env.ENABLE_ANTIVIRUS === 'false') {
    logger.debug({ tag: 'ANTIVIRUS', msg: '[Main] Antivirus is disabled (ENABLE_ANTIVIRUS=false), skipping setup' });
    return;
  }

  try {
    logger.debug({ tag: 'ANTIVIRUS', msg: '[Main] Setting up antivirus IPC handlers' });
    const antivirusIpc = setupAntivirusIpc();
    removeAntivirusIpcHandlers = antivirusIpc.removeMessagesHandlers ?? null;
    logger.debug({ tag: 'ANTIVIRUS', msg: '[Main] Antivirus IPC handlers setup complete' });
    await getAntivirusManager().initialize();
  } catch (error) {
    logger.error({ tag: 'ANTIVIRUS', msg: '[Main] Error setting up antivirus:', error });
  }
}

export function cleanupAntivirusIpc() {
  if (!removeAntivirusIpcHandlers) {
    return;
  }

  removeAntivirusIpcHandlers();
  removeAntivirusIpcHandlers = null;
}
