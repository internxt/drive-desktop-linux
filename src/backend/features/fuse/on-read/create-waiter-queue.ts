type Waiter = {
  targetByte: number;
  resolve: () => void;
  reject: (err: Error) => void;
};
type WaiterQueueState = {
  waiters: Waiter[];
  bytesAvailable: number;
};
export type WaitersController = {
  waitForBytes: (position: number, length: number) => Promise<void>;
  resolveWaiters: (bytesWritten: number) => void;
  resolveAllWaiters: () => void;
  rejectAllWaiters: (error: Error) => void;
  getBytesAvailable: () => number;
};

function resolveWaiters(state: WaiterQueueState, bytesWritten: number): void {
  state.bytesAvailable = bytesWritten;
  const remaining: Waiter[] = [];
  for (const waiter of state.waiters) {
    if (bytesWritten >= waiter.targetByte) {
      waiter.resolve();
    } else {
      remaining.push(waiter);
    }
  }
  state.waiters.length = 0;
  state.waiters.push(...remaining);
}

function resolveAllWaiters(state: WaiterQueueState): void {
  for (const waiter of state.waiters) {
    waiter.resolve();
  }
  state.waiters.length = 0;
}

function rejectAllWaiters(state: WaiterQueueState, error: Error): void {
  for (const waiter of state.waiters) {
    waiter.reject(error);
  }
  state.waiters.length = 0;
}

function waitForBytes(state: WaiterQueueState, position: number, length: number): Promise<void> {
  const targetByte = position + length;
  if (state.bytesAvailable >= targetByte) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    state.waiters.push({
      targetByte,
      resolve,
      reject,
    });
  });
}

export function createWaiterQueue(): WaitersController {
  const state: WaiterQueueState = {
    waiters: [],
    bytesAvailable: 0,
  };
  return {
    resolveWaiters: (bytesWritten) => resolveWaiters(state, bytesWritten),
    resolveAllWaiters: () => resolveAllWaiters(state),
    rejectAllWaiters: (error) => rejectAllWaiters(state, error),
    waitForBytes: (position, length) => waitForBytes(state, position, length),
    getBytesAvailable: () => state.bytesAvailable,
  };
}
