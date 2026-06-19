import { GenerateFileKey } from '@internxt/inxt-js/build/lib/utils/crypto';

type Props = {
  encryptionKey?: Buffer;
  mnemonic?: string;
  bucketId: string;
  index: Buffer;
};

export async function resolveDownloadKey({ encryptionKey, mnemonic, bucketId, index }: Props): Promise<Buffer> {
  if (encryptionKey) {
    return encryptionKey;
  }

  if (mnemonic) {
    return GenerateFileKey(mnemonic, bucketId, index);
  }

  throw new Error('Download error code 1');
}
