let resolveReady: () => void;

export const daemonReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function resolveDaemonReady(): void {
  resolveReady();
}
