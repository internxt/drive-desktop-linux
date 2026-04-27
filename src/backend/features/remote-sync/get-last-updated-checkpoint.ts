import { rewind } from './helpers';
import { DatabaseCollectionAdapter } from '../../../apps/main/database/adapters/base';
import { Nullable } from '../../../apps/shared/types/Nullable';

type DatabaseItemWithUpdatedAt = {
  updatedAt: string;
};

type Props<TItem extends DatabaseItemWithUpdatedAt> = {
  collection: DatabaseCollectionAdapter<TItem>;
  rewindMilliseconds: number;
};

export async function getLastUpdatedCheckpoint<TItem extends DatabaseItemWithUpdatedAt>({
  collection,
  rewindMilliseconds,
}: Props<TItem>): Promise<Nullable<Date>> {
  const { success, result } = await collection.getLastUpdated();

  if (!success || !result) {
    return undefined;
  }

  const updatedAt = new Date(result.updatedAt);

  return rewind(updatedAt, rewindMilliseconds);
}
