type Props<ResultValue> = {
  operation: () => Promise<ResultValue>;
};

let pending: Promise<void> = Promise.resolve();

/**
 * Background sync and lazy directory refresh write the same sqlite rows.
 * The fresh-directory snapshot, the batch write, and the directory-state update
 * have to stay in one critical section so a batch admitted by a stale snapshot
 * cannot overwrite metadata a refresh already stored.
 */
export function runWithDirectoryMetadataWriteLock<ResultValue>({ operation }: Props<ResultValue>) {
  const run = pending.then(operation, operation);
  pending = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
