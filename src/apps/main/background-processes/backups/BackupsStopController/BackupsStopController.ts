import { ProcessFatalErrorName } from '../BackupFatalErrors/BackupFatalErrors';

type ForcedByUser = 'forced-by-user';
type BackupCompleted = 'backup-completed';
type BackupFailed = 'failed';

export type StopReason = ForcedByUser | BackupCompleted | BackupFailed;

export type StopReasonPayload = {
  'forced-by-user': () => void;
  'backup-completed': () => void;
  failed: ({ errorName }: { errorName: ProcessFatalErrorName }) => void;
};

const listenerNotSet = (reason: StopReason) => {
  throw new Error(`Listener for ${reason} on set`);
};

export class BackupsStopController {
  private readonly controller = new AbortController();
  private finishedReason: StopReason | undefined = undefined;

  private end: Array<(reason: StopReason) => void> = [];

  private handlers: StopReasonPayload = {
    'forced-by-user': () => listenerNotSet('forced-by-user'),
    'backup-completed': () => listenerNotSet('backup-completed'),
    failed: () => listenerNotSet('failed'),
  };

  constructor() {
    this.controller.signal.addEventListener('abort', () => {
      const { reason, payload } = this.controller.signal.reason as {
        reason: StopReason;
        payload: any;
      };

      const handler = this.handlers[reason];

      handler(payload);

      this.end.forEach((fn) => fn(reason));
    });
  }

  hasFinished(): boolean {
    return this.finishedReason !== undefined;
  }

  userCancelledBackup() {
    this.stop('forced-by-user');
  }

  backupCompleted() {
    this.stop('backup-completed');
  }

  private stop(reason: StopReason) {
    this.finishedReason = reason;
    this.controller.abort({ reason });
  }

  failed(cause: ProcessFatalErrorName) {
    this.finishedReason = 'failed';

    this.controller.abort({
      reason: 'failed',
      payload: { errorName: cause },
    });
  }

  on<Reason extends StopReason>(
    reason: Reason,
    handler: StopReasonPayload[Reason]
  ) {
    this.handlers[reason] = handler;
  }

  onFinished(handler: (reason: StopReason) => void) {
    this.end.push(handler);
  }
}
