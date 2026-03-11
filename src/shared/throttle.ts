export function throttle(fn: () => void, delay: number) {
  const state = { lastCall: 0 };

  return function throttled() {
    const now = Date.now();
    if (now - state.lastCall >= delay) {
      state.lastCall = now;
      fn();
    }
  };
}
