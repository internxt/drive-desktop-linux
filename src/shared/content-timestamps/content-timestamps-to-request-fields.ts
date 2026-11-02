import type { ContentTimestamps } from './content-timestamps-from-stats';

export type ContentTimestampRequestFields = {
  modificationTime?: string;
  creationTime?: string;
};

/** ISO strings for create/replace folder and file bodies. Missing fields are omitted so the server can default them. */
export function contentTimestampsToRequestFields(
  timestamps?: Partial<ContentTimestamps>,
): ContentTimestampRequestFields {
  const fields: ContentTimestampRequestFields = {};

  if (timestamps?.modificationTime != null) {
    fields.modificationTime = timestamps.modificationTime.toISOString();
  }

  if (timestamps?.creationTime != null) {
    fields.creationTime = timestamps.creationTime.toISOString();
  }

  return fields;
}
