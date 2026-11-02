import { describe, expect, it } from 'vitest';
import { contentTimestampsToRequestFields } from './content-timestamps-to-request-fields';

describe('contentTimestampsToRequestFields', () => {
  it('returns empty object when timestamps are missing', () => {
    expect(contentTimestampsToRequestFields()).toEqual({});
    expect(contentTimestampsToRequestFields(undefined)).toEqual({});
  });

  it('serializes both fields when present', () => {
    const modificationTime = new Date('2024-01-02T03:04:05.000Z');
    const creationTime = new Date('2023-06-01T12:00:00.000Z');

    expect(contentTimestampsToRequestFields({ modificationTime, creationTime })).toEqual({
      modificationTime: modificationTime.toISOString(),
      creationTime: creationTime.toISOString(),
    });
  });

  it('omits undefined fields without dropping the other', () => {
    const modificationTime = new Date('2024-01-02T03:04:05.000Z');

    expect(contentTimestampsToRequestFields({ modificationTime })).toEqual({
      modificationTime: modificationTime.toISOString(),
    });
  });
});
