import {
  getHydration,
  setHydration,
  deleteHydration,
  destroyAllHydrations,
  type HydrationEntry,
} from './hydration-registry';

function createFakeEntry(): HydrationEntry {
  return {
    writer: {
      waitForBytes: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    },
    downloadPromise: Promise.resolve(),
  };
}

describe('hydration-registry', () => {
  afterEach(async () => {
    await destroyAllHydrations();
  });

  it('should return undefined for an unknown contentsId', () => {
    expect(getHydration('unknown')).toBe(undefined);
  });

  it('should store and retrieve a hydration entry', () => {
    const entry = createFakeEntry();

    setHydration('abc', entry);

    expect(getHydration('abc')).toBe(entry);
  });

  it('should delete a hydration entry', () => {
    const entry = createFakeEntry();
    setHydration('abc', entry);

    deleteHydration('abc');

    expect(getHydration('abc')).toBe(undefined);
  });

  it('should destroy all hydrations and clear the registry', async () => {
    const entry1 = createFakeEntry();
    const entry2 = createFakeEntry();
    setHydration('a', entry1);
    setHydration('b', entry2);

    await destroyAllHydrations();

    expect(entry1.writer.destroy).toHaveBeenCalledOnce();
    expect(entry2.writer.destroy).toHaveBeenCalledOnce();
    expect(getHydration('a')).toBe(undefined);
    expect(getHydration('b')).toBe(undefined);
  });
});
