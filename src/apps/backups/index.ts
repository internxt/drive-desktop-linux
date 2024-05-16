import { Backup } from './Backup';
import { BackupsIPC } from './BackupsIPC';
import { BackupsDependencyContainerFactory } from './dependency-injection/BackupsDependencyContainerFactory';

async function setUpBackups() {
  const data = await BackupsIPC.invoke('BACKUPS:GET_BACKUPS');

  const container = await BackupsDependencyContainerFactory.build();

  const backup = new Backup(container);

  backup.run(data);
}

setUpBackups();
