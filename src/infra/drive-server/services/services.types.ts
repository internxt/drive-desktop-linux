import { components } from '../../schemas';

export type AddItemToTrashRequest = components['schemas']['ItemToTrash']

export type TrashItemPayload =
  | { uuid: string; type: string }
  | { id: string; type: string };
