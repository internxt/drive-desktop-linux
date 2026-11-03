import { writeTelemetryEntry } from './telemetry-writer';
import type { FuseTelemetryPayload } from './telemetry.types';

type AppendFileFn = (path: string, data: string, callback: (err: Error | null) => void) => void;

type RecordFuseTelemetryProps = FuseTelemetryPayload & {
  logsPath?: string;
  destinationPath?: string;
  appendFn?: AppendFileFn;
};

export function recordFuseTelemetry(props: RecordFuseTelemetryProps) {
  const { logsPath, destinationPath, appendFn, ...payload } = props;
  writeTelemetryEntry({
    entry: {
      category: 'FUSE',
      timestamp: new Date().toISOString(),
      ...payload,
    },
    logsPath,
    destinationPath,
    appendFn,
  });
}
