import { validate } from 'uuid';
import { AddItemToTrashRequest, TrashItemPayload } from '../services.types';

export function mapToTrashPayload(
  item: AddItemToTrashRequest
): TrashItemPayload | undefined {
  const { uuid, id, type } = item;

  if (uuid.trim().length && validate(uuid)) {
    return { uuid, type };
  }

  if (id) {
    return { id, type };
  }

  return undefined;
}
