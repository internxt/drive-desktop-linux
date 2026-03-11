import { ContainerBuilder } from 'diod';

export async function backgroundProcessSharedInfraBuilder(): Promise<ContainerBuilder> {
  return new ContainerBuilder();
}
