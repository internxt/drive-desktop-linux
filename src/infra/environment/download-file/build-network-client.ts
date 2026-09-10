import { Network } from '@internxt/sdk';
import { createHash } from 'node:crypto';
import { INTERNXT_CLIENT, INTERNXT_VERSION } from '../../../core/utils/utils';
import { withDownloadLinksCache } from './with-download-links-cache';

export type NetworkClientCredentials = {
  bridgeUser: string;
  userId: string;
};

export function buildNetworkClient(credentials: NetworkClientCredentials): Network.Network {
  const network = Network.Network.client(
    process.env.BRIDGE_URL,
    {
      clientName: INTERNXT_CLIENT,
      clientVersion: INTERNXT_VERSION,
      desktopHeader: process.env.INTERNXT_DESKTOP_HEADER_KEY,
    },
    {
      bridgeUser: credentials.bridgeUser,
      userId: createHash('sha256').update(credentials.userId).digest('hex'),
    },
  );

  return withDownloadLinksCache({ network });
}
