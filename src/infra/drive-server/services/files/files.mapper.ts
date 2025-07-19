import { validate } from 'uuid';
import { AddFileToTrashRequest, TrashItemPayload } from './files.types';

export function mapToTrashPayload(
  item: AddFileToTrashRequest
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
