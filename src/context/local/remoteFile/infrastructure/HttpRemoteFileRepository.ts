import { Service } from 'diod';
import { RemoteFileRepository } from '../domain/RemoteFileRepository';
import { Crypt } from '../../../virtual-drive/shared/domain/Crypt';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { CreateFileDTO } from '../../../virtual-drive/files/infrastructure/dtos/CreateFileDTO';
import { AuthorizedClients } from '../../../../apps/shared/HttpClient/Clients';

@Service()
export class HttpRemoteFileRepository implements RemoteFileRepository {
  constructor(
    private readonly clients: AuthorizedClients,
    private readonly crypt: Crypt,
    private readonly bucket: string
  ) {}

  async create(
    id: string,
    name: string,
    type: string,
    size: number,
    folderId: number
  ): Promise<void> {
    const encryptedName = this.crypt.encryptName(name, folderId.toString());

    if (!encryptedName) {
      throw new Error('Failed to encrypt name');
    }

    const body: CreateFileDTO = {
      file: {
        fileId: id,
        file_id: id,
        type: type,
        size: size,
        name: encryptedName,
        plain_name: name,
        bucket: this.bucket,
        folder_id: folderId,
        encrypt_version: EncryptionVersion.Aes03,
      },
    };

    await this.clients.drive.post(
      `${process.env.API_URL}/api/storage/file`,
      body
    );
  }

  async update(old: string, current: string, size: number): Promise<void> {
    await this.clients.newDrive.put(
      `${process.env.NEW_DRIVE_URL}/drive/files/${old}`,
      {
        fileId: current,
        size,
      }
    );
  }

  delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
