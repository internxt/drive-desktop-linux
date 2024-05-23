import { broadcastToWindows } from '../../../windows';

type Status = 'STANDBY' | 'RUNNING';

export class BackupsProcessStatus {
  constructor(private status: Status) {}

  set(status: Status) {
    this.status = status;
    broadcastToWindows('backups-status-changed', status);
  }

  isIn(status: Status): boolean {
    return this.status === status;
  }

  current(): Status {
    return this.status;
  }
}
