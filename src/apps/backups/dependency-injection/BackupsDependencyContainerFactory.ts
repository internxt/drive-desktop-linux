import { Container, ContainerBuilder } from 'diod';

export class BackupsDependencyContainerFactory {
  static async build(): Promise<Container> {
    const builder = new ContainerBuilder();

    const container = builder.build();

    return container;
  }
}
