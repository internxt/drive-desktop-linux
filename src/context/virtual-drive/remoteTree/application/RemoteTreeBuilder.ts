import { Service } from 'diod';
import { RemoteItemsGenerator } from '../domain/RemoteItemsGenerator';
import { RemoteTree } from '../domain/Tree';
import { Traverser } from './Traverser';

@Service()
export class RemoteTreeBuilder {
  constructor(
    private readonly remoteItemsGenerator: RemoteItemsGenerator,
    private readonly traverser: Traverser
  ) {}

  async run(): Promise<RemoteTree> {
    const items = await this.remoteItemsGenerator.getAll();

    return this.traverser.run(items);
  }
}
