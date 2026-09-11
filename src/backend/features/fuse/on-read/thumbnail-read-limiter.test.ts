import { withThumbnailReadSlot } from './thumbnail-read-limiter';

describe('withThumbnailReadSlot', () => {
  it('should cap the number of concurrently running tasks', async () => {
    let running = 0;
    let maxRunning = 0;

    const task = () =>
      withThumbnailReadSlot(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running--;
      });

    await Promise.all(Array.from({ length: 10 }, task));

    expect(maxRunning).toBeLessThanOrEqual(4);
  });

  it('should let queued tasks run once a slot is released', async () => {
    const order: number[] = [];

    const task = (id: number) =>
      withThumbnailReadSlot(async () => {
        order.push(id);
      });

    await Promise.all(Array.from({ length: 6 }, (_, index) => task(index)));

    expect(order).toHaveLength(6);
  });
});
