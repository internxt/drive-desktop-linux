import { Network } from '@internxt/sdk';
import { validateMnemonic } from 'bip39';
import { GenerateFileKey } from '@internxt/inxt-js/build/lib/utils/crypto';
import { randomBytes } from 'node:crypto';

export function buildCryptoLib(): Network.Crypto {
  return {
    algorithm: Network.ALGORITHMS.AES256CTR,
    validateMnemonic: (mnemonic: string) => validateMnemonic(mnemonic),
    generateFileKey: (mnemonic, bucketId, index) => GenerateFileKey(mnemonic, bucketId, index as Buffer),
    randomBytes,
  };
}
