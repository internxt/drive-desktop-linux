import { join } from 'node:path';
import { PATHS } from '../../core/electron/paths';

type GetTelemetryFilePathProps = {
  logsPath?: string;
};

export const QA_TELEMETRY_FILENAME = 'qa-telemetry.json';

export function isTelemetryEnabled() {
  return process.env.NODE_ENV === 'development' || process.env.ENABLE_QA_TELEMETRY === 'true';
}

export function getTelemetryFilePath(props?: GetTelemetryFilePathProps) {
  const baseLogsPath = props?.logsPath ?? PATHS.LOGS;
  return join(baseLogsPath, QA_TELEMETRY_FILENAME);
}
