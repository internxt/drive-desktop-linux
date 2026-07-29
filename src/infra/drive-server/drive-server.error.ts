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

function isEmptyFileMessage(message?: string) {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();

  return normalizedMessage.includes('empty file') || normalizedMessage.includes('empty files');
}

function isFileSizeLimitMessage(message?: string) {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('too big') ||
    normalizedMessage.includes('too large') ||
    normalizedMessage.includes('file size exceeds') ||
    normalizedMessage.includes('size exceeds the maximum allowed')
  );
}

export function mapStatusToErrorCause(status: number, message?: string): DriveServerErrorCause {
  if (status === 401) return 'NO_PERMISSION';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 400) {
    if (isEmptyFileMessage(message)) return 'EMPTY_FILE';
    if (isFileSizeLimitMessage(message)) return 'FILE_TOO_BIG';

    return 'BAD_REQUEST';
  }
  if (status === 402) {
    if (isEmptyFileMessage(message)) return 'EMPTY_FILE';
    if (isFileSizeLimitMessage(message)) return 'FILE_TOO_BIG';

    return 'FILE_TOO_BIG';
  }
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status >= 400 && status < 500) return 'BAD_REQUEST';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}
