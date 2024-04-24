import { FuseCallback } from './FuseCallback';
import { VirtualDrive } from '../../drive/VirtualDrive';

export class GetXAttributeCallback extends FuseCallback<Buffer> {
  constructor(private readonly drive: VirtualDrive) {
    super('Get X Attribute');
  }

  async execute(path: string, name: string, size: string) {
    const isAvailableLocally = await this.drive.isLocallyAvailable(path);

    if (isAvailableLocally) {
      return this.right(Buffer.from('on_local'));
    }

    const buff = Buffer.from('on_remote');
    return this.right(buff);
  }
}
