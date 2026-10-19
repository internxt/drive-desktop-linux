import type { MailBridgeClientConfig } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { appInfo } from '../../../../apps/main/app-info/app-info';

/** Builds Mail client settings from one authentication snapshot supplied by the caller. */
export function getMailBridgeClientConfig(token: string): MailBridgeClientConfig {
  return {
    gatewayUrl: process.env.NEW_DRIVE_URL,
    clientName: appInfo.name,
    clientVersion: appInfo.version,
    desktopHeader: process.env.INTERNXT_DESKTOP_HEADER_KEY,
    token,
  };
}
