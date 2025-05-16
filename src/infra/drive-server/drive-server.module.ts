import { AuthService } from './services/auth/auth.service';
import { BackupService } from './services/backup/backup.service';
import { FilesService } from './services/files/files.service';
import { FoldersService } from './services/folders/folders.service';

export class DriveServerModule {

  constructor(
    public auth = new AuthService(),
    public backup = new BackupService(),
    public files = new FilesService(),
    public folders = new FoldersService(),
  ) {}
}

export const driveServerModule = new DriveServerModule();
