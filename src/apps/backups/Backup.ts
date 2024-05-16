import { Container } from 'diod';
import { BackupData } from './BackupData';
import GenerateCurrentLocalFiles from '../../context/local/localFile/application/GenerateCurrentLocalFiles';

export class Backup {
  constructor(private readonly container: Container) {}

  async run(backupData: BackupData): Promise<void> {
    const currentLocal = this.container.get(GenerateCurrentLocalFiles);
  }
}
