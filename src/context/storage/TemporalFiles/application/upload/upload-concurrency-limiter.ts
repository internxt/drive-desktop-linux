const MAX_CONCURRENT_UPLOADS = 5;

let active = 0;
const waiting: Array<() => void> = [];

function createReleaseSlot() {
  let released = false;

  return function releaseSlot() {
    if (released) return;
    released = true;
    active--;

    const next = waiting.shift();
    if (next) next();
  };
}

export async function acquireUploadSlot(): Promise<() => void> {
  if (active < MAX_CONCURRENT_UPLOADS) {
    active++;
    return createReleaseSlot();
  }

  return new Promise((resolve) => {
    waiting.push(() => {
      active++;
      resolve(createReleaseSlot());
    });
  });
}
