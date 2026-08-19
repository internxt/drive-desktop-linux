function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as PromiseLike<void>).then === 'function'
  );
}

export async function tryCatch(fn: () => Promise<void> | void, onError?: (err: unknown) => void): Promise<void> {
  try {
    const result = fn();

    if (isPromiseLike(result)) await result;
  } catch (err) {
    onError?.(err);
  }
}
