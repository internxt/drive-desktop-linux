import { SyncError } from '../../../shared/issues/SyncErrorCause';

type ProcessErrorMessages = Record<SyncError, string>;

export const shortMessages: ProcessErrorMessages = {
  ABORTED: 'issues.short-error-messages.unknown',
  RATE_LIMITED: 'issues.short-error-messages.unknown',
  NOT_EXISTS: 'issues.short-error-messages.file-does-not-exist',
  NO_INTERNET: 'issues.short-error-messages.no-internet-connection',
  NO_REMOTE_CONNECTION: 'issues.short-error-messages.no-remote-connection',
  BAD_RESPONSE: 'issues.short-error-messages.bad-response',
  EMPTY_FILE: 'issues.short-error-messages.empty-file',
  EMPTY_FILE_LIMIT_REACHED: 'issues.short-error-messages.empty-file',
  EMPTY_FILE_UPGRADE_REQUIRED: 'issues.short-error-messages.empty-file',
  FILE_TOO_BIG: 'issues.short-error-messages.file-too-big',
  FILE_NON_EXTENSION: 'issues.short-error-messages.file-non-extension',
  DUPLICATED_NODE: 'issues.short-error-messages.duplicated-node',
  ACTION_NOT_PERMITTED: 'issues.short-error-messages.action-not-permitted',
  FILE_ALREADY_EXISTS: 'issues.short-error-messages.file-already-exists',
  PARENT_FOLDER_NOT_FOUND: 'issues.short-error-messages.unknown',
  COULD_NOT_ENCRYPT_NAME: '',
  BAD_REQUEST: 'issues.short-error-messages.no-remote-connection',
  UNKNOWN: 'issues.short-error-messages.unknown',
  INTERNAL_SERVER_ERROR: 'issues.short-error-messages.unknown',
  ITEMS_SKIPPED: 'issues.short-error-messages.unknown',
  BASE_DIRECTORY_DOES_NOT_EXIST: 'issues.short-error-messages.file-does-not-exist',
  INSUFFICIENT_PERMISSION: 'issues.short-error-messages.no-permission',
  NOT_ENOUGH_SPACE: 'issues.short-error-messages.not-enough-space',
};
