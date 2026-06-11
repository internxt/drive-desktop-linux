import { aes, stringUtils } from '@internxt/lib';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { validateMnemonic } from 'bip39';
import { clipboard } from 'electron';
import { getCredentials } from '../../../../apps/main/auth/get-credentials';
import { createSharingResult } from './create-sharing-result';
import { fetchRandomDomain } from './fetch-random-domain';
import { resolveShareableItem } from './resolve-shareable-item';

export type Props = { path: string };

export async function generateLink({ path }: Props) {
  const { mnemonic } = getCredentials();

  if (!validateMnemonic(mnemonic)) {
    throw new Error('The user mnemonic is invalid');
  }

  const item = await resolveShareableItem({ path });
  const domain = await fetchRandomDomain();
  const plainCode = stringUtils.generateRandomStringUrlSafe(8);
  const encryptionKey = aes.encrypt(mnemonic, plainCode);
  const encryptedCode = aes.encrypt(plainCode, mnemonic);
  const sharing = await createSharingResult({
    encryptedCode,
    encryptionKey,
    item,
  });
  const recoveredCode = aes.decrypt(sharing.encryptedCode, mnemonic);
  const sharingId = stringUtils.encodeV4Uuid(sharing.id);
  const shareLink = `${domain}/sh/${item.itemType}/${sharingId}/${recoveredCode}`;

  clipboard.writeText(shareLink);

  logger.debug({
    msg: 'link copied',
    itemType: item.itemType,
    path,
  });

  return shareLink;
}
