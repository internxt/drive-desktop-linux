const SyncErrorCauses = [
  'NOT_EXISTS',

  'NO_PERMISSION',

  'NO_INTERNET',

  'NO_REMOTE_CONNECTION',

  'BAD_RESPONSE',

  'EMPTY_FILE',

  'FILE_TOO_BIG',

  'FILE_NON_EXTENSION',

  'UNKNOWN',

  'DUPLICATED_NODE',
  'ACTION_NOT_PERMITTED',
  'FILE_ALREADY_EXISTS',
  'COULD_NOT_ENCRYPT_NAME',
  'BAD_REQUEST',
  'BASE_DIRECTORY_DOES_NOT_EXIST',
  'INSUFFICIENT_PERMISSION',
] as const;

export type SyncErrorCause = (typeof SyncErrorCauses)[number];

export function isSyncErrorCause(maybe: unknown): maybe is SyncErrorCause {
  return SyncErrorCauses.includes(maybe as SyncErrorCause);
}
