import { createMailBridgeService } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { linuxMailBridgePlatform } from './mail-bridge-platform';

// Startup and token refresh must use the same lifecycle instance and control socket.
const runtime = createMailBridgeService(linuxMailBridgePlatform);

export const {
  startMailBridge,
  stopMailBridge,
  getMailBridgeStatus,
  getMailBridgeSyncProgress,
  subscribeToMailBridgeStatus,
  subscribeToMailBridgeSyncProgress,
  resyncMailBridge,
  updateMailBridgeAccessToken,
} = runtime;
