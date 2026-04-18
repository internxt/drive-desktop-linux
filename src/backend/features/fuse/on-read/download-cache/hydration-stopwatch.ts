import { Stopwatch } from '../../../../../apps/shared/types/Stopwatch';

const stopwatches = new Map<string, Stopwatch>();

export function startStopwatch(contentsId: string): void {
  const stopWatch = new Stopwatch();
  stopWatch.start();
  stopwatches.set(contentsId, stopWatch);
}

export function getStopwatch(contentsId: string): Stopwatch | undefined {
  return stopwatches.get(contentsId);
}

export function deleteStopwatch(contentsId: string): void {
  stopwatches.delete(contentsId);
}
