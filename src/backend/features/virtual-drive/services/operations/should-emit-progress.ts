const PROGRESS_UPDATE_INTERVAL_MS = 250;

export type ProgressReporterState = {
  lastUpdateAt: number;
};

type Props = {
  bytesDownloaded: number;
  fileSize: number;
  state: ProgressReporterState;
};

export function shouldEmitProgress({ bytesDownloaded, fileSize, state }: Props) {
  const now = Date.now();
  const reachedEnd = bytesDownloaded >= fileSize;
  const elapsedSinceLastUpdate = now - state.lastUpdateAt;

  if (!reachedEnd && elapsedSinceLastUpdate < PROGRESS_UPDATE_INTERVAL_MS) {
    return false;
  }

  state.lastUpdateAt = now;
  return true;
}
