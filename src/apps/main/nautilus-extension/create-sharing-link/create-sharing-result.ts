import { createSharing } from '../../../../infra/drive-server/services/sharings/services/create-sharing';
import { CreateSharingPayload, ShareableItem, SharingResponse } from './types';
import { toError } from './to-error';

type Props = {
  encryptedCode: string;
  encryptionKey: string;
  item: ShareableItem;
};

export async function createSharingResult({ encryptedCode, encryptionKey, item }: Props) {
  const payload: CreateSharingPayload = {
    encryptedCode,
    encryptedPassword: null,
    encryptionAlgorithm: 'inxt-v2',
    encryptionKey,
    itemId: item.itemId,
    itemType: item.itemType,
    persistPreviousSharing: true,
  };

  const result = await createSharing({ body: payload });

  if (result.error) {
    throw toError({
      context: 'Error while creating sharing',
      error: result.error,
    });
  }

  return result.data as SharingResponse;
}
