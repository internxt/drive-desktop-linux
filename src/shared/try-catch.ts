export async function tryCatch(fn: () => Promise<void>, onError?: (err: unknown) => void): Promise<void> {
  try {
    await fn();
  } catch (err) {
    onError?.(err);
  }
}
