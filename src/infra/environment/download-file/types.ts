import { Network } from '@internxt/sdk';

export type DownloadFileProps = {
  signal: AbortController;
  fileId: string;
  bucketId: string;
  mnemonic: string;
  network: Network.Network;
  range: {
    position: number;
    length: number;
  };
};
