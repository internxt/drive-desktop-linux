import type { QueueState } from './types';

export function createTemporalFileUploadQueueState() {
  const state: QueueState = {
    queuedPaths: new Set<string>(),
    tasks: [],
    draining: false,
  };

  return state;
}
