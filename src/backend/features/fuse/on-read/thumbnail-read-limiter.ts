const MAX_CONCURRENT_THUMBNAIL_READS = 4;

let activeReads = 0;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeReads < MAX_CONCURRENT_THUMBNAIL_READS) {
    activeReads++;
    return Promise.resolve();
  }

  return new Promise((resolve) => queue.push(resolve));
}

function releaseSlot(): void {
  const next = queue.shift();
  if (next) {
    next();
  } else {
    activeReads--;
  }
}

export async function withThumbnailReadSlot<T>(task: () => Promise<T>): Promise<T> {
  await acquireSlot();
  try {
    return await task();
  } finally {
    releaseSlot();
  }
}
