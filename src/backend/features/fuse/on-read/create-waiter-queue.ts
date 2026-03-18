const WAITER_TIMEOUT_MS = 25_000;
let nextWaiterId = 0;
type Waiter = {
  id: number;
  targetByte: number;
  resolve: () => void;
  reject: (err: Error) => void;
};

export type WaitersController = {
  waitForBytes: (position: number, length: number) => Promise<void>;
  resolveWaiters: (bytesWritten: number) => void;
  rejectAllWaiters: (error: Error) => void;
};

function resolveWaiters(waiters: Waiter[], bytesWritten: number): void {
  const remaining: Waiter[] = [];
  for (const waiter of waiters) {
    if (bytesWritten >= waiter.targetByte) {
      waiter.resolve();
    } else {
      remaining.push(waiter);
    }
  }
  waiters.length = 0;
  waiters.push(...remaining);
}

function rejectAllWaiters(waiters: Waiter[], error: Error): void {
  for (const waiter of waiters) {
    waiter.reject(error);
  }
  waiters.length = 0;
}

function waitForBytes(waiters: Waiter[], position: number, length: number, timeoutMs: number): Promise<void> {
  const targetByte = position + length;
  const id = nextWaiterId++;

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = waiters.findIndex((w) => w.id === id);
      if (index !== -1) waiters.splice(index, 1);
      reject(new Error(`[WaiterQueue] Timeout waiting for byte ${targetByte}`));
    }, timeoutMs);

    waiters.push({
      id,
      targetByte,
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
  });
}

export function createWaiterQueue(timeoutMs = WAITER_TIMEOUT_MS): WaitersController {
  const waiters: Waiter[] = [];

  return {
    resolveWaiters: (bytesWritten) => resolveWaiters(waiters, bytesWritten),
    rejectAllWaiters: (error) => rejectAllWaiters(waiters, error),
    waitForBytes: (position, length) => waitForBytes(waiters, position, length, timeoutMs),
  };
}
