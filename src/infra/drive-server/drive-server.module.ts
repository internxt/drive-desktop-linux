import { AuthService } from './services/auth/auth.service';

export class DriveServerModule {

  constructor(
    public auth = new AuthService(),
  ) {}
}

export const driveServerModule = new DriveServerModule();
