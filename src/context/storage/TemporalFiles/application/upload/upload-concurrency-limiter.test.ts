import { acquireUploadSlot } from './upload-concurrency-limiter';

describe('acquireUploadSlot', () => {
  it('grants slots immediately while under the concurrency cap', async () => {
    const releases = await Promise.all([
      acquireUploadSlot(),
      acquireUploadSlot(),
      acquireUploadSlot(),
      acquireUploadSlot(),
      acquireUploadSlot(),
    ]);

    releases.forEach((release) => release());
  });

  it('queues callers beyond the concurrency cap until a slot is released', async () => {
    const releases = await Promise.all([
      acquireUploadSlot(),
      acquireUploadSlot(),
      acquireUploadSlot(),
      acquireUploadSlot(),
      acquireUploadSlot(),
    ]);

    let sixthGranted = false;
    const sixthPromise = acquireUploadSlot().then((release) => {
      sixthGranted = true;
      return release;
    });

    await Promise.resolve();
    expect(sixthGranted).toBe(false);

    releases[0]();

    const sixthRelease = await sixthPromise;
    expect(sixthGranted).toBe(true);

    releases.slice(1).forEach((release) => release());
    sixthRelease();
  });

  it('ignores repeated calls to the same release function', async () => {
    const release = await acquireUploadSlot();

    release();
    expect(() => release()).not.toThrow();
  });
});
