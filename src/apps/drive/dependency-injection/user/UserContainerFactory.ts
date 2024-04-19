import { ContainerBuilder } from 'diod';
import { registerUsageServices } from './usage/registerUsageServices';

export class UserContainerFactory {
  static async build(builder: ContainerBuilder): Promise<void> {
    registerUsageServices(builder);
  }
}
