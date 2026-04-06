import { rewind } from './helpers';
import { DatabaseCollectionAdapter } from '../database/adapters/base';
import { Nullable } from '../../shared/types/Nullable';

type DatabaseItemWithUpdatedAt = {
  updatedAt: string;
};

type Pops<TItem extends DatabaseItemWithUpdatedAt> = {
  collection: DatabaseCollectionAdapter<TItem>;
  rewindMilliseconds: number;
};

export async function getLastUpdatedCheckpoint<TItem extends DatabaseItemWithUpdatedAt>({
  collection,
  rewindMilliseconds,
}: Pops<TItem>): Promise<Nullable<Date>> {
  const { success, result } = await collection.getLastUpdated();

  if (!success || !result) {
    return undefined;
  }

  const updatedAt = new Date(result.updatedAt);

  return rewind(updatedAt, rewindMilliseconds);
}