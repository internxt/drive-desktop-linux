const DriveServerErrorCauses = [
  'NO_PERMISSION',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'SERVER_ERROR',
  'NETWORK_ERROR',
  'TOO_MANY_REQUESTS',
  'CONFLICT',
  'EMPTY_FILE',
  'FILE_TOO_BIG',
  'UNKNOWN',
] as const;
export type DriveServerErrorCause = (typeof DriveServerErrorCauses)[number];
export class DriveServerError extends Error {
  constructor(
    public readonly cause: DriveServerErrorCause,
    public readonly statusCode?: number,
    message?: string,
  ) {
    super(message);
  }
}

export function mapStatusToErrorCause(status: number, message?: string): DriveServerErrorCause {
  if (status === 401) return 'NO_PERMISSION';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 402) {
    if (message) {
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes('empty file') || normalizedMessage.includes('empty files')) {
        return 'EMPTY_FILE';
      }

      if (normalizedMessage.includes('too big') || normalizedMessage.includes('too large')) {
        return 'FILE_TOO_BIG';
      }
    }

    return 'FILE_TOO_BIG';
  }
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status >= 400 && status < 500) return 'BAD_REQUEST';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}
