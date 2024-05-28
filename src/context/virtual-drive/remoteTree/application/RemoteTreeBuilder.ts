import { Service } from 'diod';
import { RemoteItemsGenerator } from '../domain/RemoteItemsGenerator';
import { RemoteTree } from '../domain/RemoteTree';
import { Traverser } from './Traverser';

@Service()
export class RemoteTreeBuilder {
  constructor(
    private readonly remoteItemsGenerator: RemoteItemsGenerator,
    private readonly traverser: Traverser
  ) {}

  async run(rootFolderId: number): Promise<RemoteTree> {
    const items = await this.remoteItemsGenerator.getAll();

    return this.traverser.run(rootFolderId, items);
  }
}
