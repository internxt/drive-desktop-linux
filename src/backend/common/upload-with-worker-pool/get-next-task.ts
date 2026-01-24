import { QueueIndex } from './types';

export function getNextTask<T>(queue: T[], index: QueueIndex): T | null {
  if (index.value >= queue.length) return null;
  return queue[index.value++];
}
