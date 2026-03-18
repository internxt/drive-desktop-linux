import { createWaiterQueue } from './create-waiter-queue';

describe('createWaiterQueue', () => {
  it('should resolve a waiter when enough bytes have been written', async () => {
    const queue = createWaiterQueue();

    const promise = queue.waitForBytes(0, 10);
    queue.resolveWaiters(10);

    await expect(promise).resolves.toBe(undefined);
  });

  it('should not resolve a waiter when not enough bytes have been written', async () => {
    const queue = createWaiterQueue();
    let resolved = false;

    const promise = queue.waitForBytes(0, 10).then(() => {
      resolved = true;
    });

    queue.resolveWaiters(5);
    await Promise.resolve();

    expect(resolved).toBe(false);

    queue.resolveWaiters(10);
    await promise;
  });

  it('should resolve a waiter when bytes written covers position + length', async () => {
    const queue = createWaiterQueue();

    const promise = queue.waitForBytes(50, 10);
    queue.resolveWaiters(60);

    await expect(promise).resolves.toBe(undefined);
  });

  it('should resolve multiple waiters at once when bytes are sufficient', async () => {
    const queue = createWaiterQueue();

    const promise1 = queue.waitForBytes(0, 5);
    const promise2 = queue.waitForBytes(0, 10);
    queue.resolveWaiters(10);

    await expect(promise1).resolves.toBe(undefined);
    await expect(promise2).resolves.toBe(undefined);
  });

  it('should only resolve waiters whose target byte has been reached', async () => {
    const queue = createWaiterQueue();
    let secondResolved = false;

    const promise1 = queue.waitForBytes(0, 5);
    const promise2 = queue.waitForBytes(0, 20).then(() => {
      secondResolved = true;
    });

    queue.resolveWaiters(10);
    await Promise.resolve();

    await expect(promise1).resolves.toBe(undefined);
    expect(secondResolved).toBe(false);

    queue.resolveWaiters(20);
    await promise2;
  });

  it('should reject all waiters when rejectAllWaiters is called', async () => {
    const queue = createWaiterQueue();
    const error = new Error('download failed');

    const promise1 = queue.waitForBytes(0, 5);
    const promise2 = queue.waitForBytes(0, 10);
    queue.rejectAllWaiters(error);

    await expect(promise1).rejects.toThrow('download failed');
    await expect(promise2).rejects.toThrow('download failed');
  });

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should reject a waiter when it times out', async () => {
      const queue = createWaiterQueue(100);

      const promise = queue.waitForBytes(0, 10);
      const assertion = expect(promise).rejects.toThrow('[WaiterQueue] Timeout waiting for byte 10');
      await vi.advanceTimersByTimeAsync(100);

      await assertion;
    });

    it('should remove the timed-out waiter from the queue', async () => {
      const queue = createWaiterQueue(100);

      const promise = queue.waitForBytes(0, 10).catch(() => {});
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // resolving after timeout should not throw
      queue.resolveWaiters(10);
    });

    it('should clear the timeout when a waiter is resolved', async () => {
      const queue = createWaiterQueue(100);

      const promise = queue.waitForBytes(0, 10);
      queue.resolveWaiters(10);
      await promise;

      await vi.advanceTimersByTimeAsync(100);
      // no rejection — timeout was cleared
    });

    it('should clear the timeout when a waiter is rejected', async () => {
      const queue = createWaiterQueue(100);

      const promise = queue.waitForBytes(0, 10);
      queue.rejectAllWaiters(new Error('failed'));
      await promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(100);
      // no double rejection — timeout was cleared
    });
  });
});
