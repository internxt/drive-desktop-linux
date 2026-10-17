export type HttpTelemetryPayload = {
  method: string;
  url: string;
  durationMs: number;
  status: number;
  error?: string;
};

export type FuseTelemetryPayload = {
  operation: string;
  durationMs: number;
  errno: string;
  processName?: string;
  path?: string;
  bytes?: number;
};

export type TelemetryEntry =
  | ({ category: 'HTTP'; timestamp: string } & HttpTelemetryPayload)
  | ({ category: 'FUSE'; timestamp: string } & FuseTelemetryPayload);
