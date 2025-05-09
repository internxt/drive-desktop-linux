import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import axios from 'axios';
import { Service } from 'diod';
import { Either, left, right } from '../../../shared/domain/Either';
import { DriveDesktopError } from '../../../shared/domain/errors/DriveDesktopError';
import { Crypt } from '../../shared/domain/Crypt';

import {
  FileDataToPersist,
  PersistedFileData,
  RemoteFileSystem,
} from '../domain/file-systems/RemoteFileSystem';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';
import { CreateFileBodyRequest } from '../../../../infra/drive-server/services/files/files.types';

@Service()
export class SDKRemoteFileSystem implements RemoteFileSystem {
  constructor(
    private readonly crypt: Crypt,
    private readonly bucket: string
  ) {}

  async persist(
    dataToPersists: FileDataToPersist
  ): Promise<Either<DriveDesktopError, PersistedFileData>> {
    const plainName = dataToPersists.path.name();

    const encryptedName = this.crypt.encryptName(
      plainName,
      dataToPersists.folderId.value.toString()
    );

    if (!encryptedName) {
      return left(
        new DriveDesktopError(
          'COULD_NOT_ENCRYPT_NAME',
          `Could not encrypt the file name: ${plainName} with salt: ${dataToPersists.folderId.value.toString()}`
        )
      );
    }

    const body: CreateFileBodyRequest = {
      bucket: this.bucket,
      fileId: dataToPersists.contentsId.value,
      encryptVersion: EncryptionVersion.Aes03,
      folderUuid: dataToPersists.folderUuid,
      size: dataToPersists.size.value,
      plainName: plainName,
      type: dataToPersists.path.extension(),
    };

    const response = await driveServerModule.files.createFile(body);
    if (response.isRight()) {
      const data = response.getRight();
      const result: PersistedFileData = {
        modificationTime: data.updatedAt,
        id: data.id,
        uuid: data.uuid,
        createdAt: data.createdAt,
      };
      return right(result);
    } else {
      const error = response.getLeft();
      if (axios.isAxiosError(error.cause)) {
        const status = error.cause.response?.status;
        switch (true) {
          case status === undefined:
            return left(
              new DriveDesktopError(
                'UNKNOWN',
                `Response with status ${status} not expected`
              )
            );

          case status === 400:
            return left(
              new DriveDesktopError(
                'BAD_REQUEST',
                `Some data was not valid for ${plainName}: ${body}`
              )
            );
          case status === 409:
            return left(
              new DriveDesktopError(
                'FILE_ALREADY_EXISTS',
                `File with name ${plainName} on ${dataToPersists.folderId.value} already exists`
              )
            );
          default:
            if (status >= 500) {
              return left(
                new DriveDesktopError(
                  'BAD_RESPONSE',
                  `The server could not handle the creation of ${plainName}: ${body}`
                )
              );
            } else {
              return left(
                new DriveDesktopError(
                  'UNKNOWN',
                  `Response with status ${status} not expected`
                )
              );
            }
        }
      } else {
        return left(
          new DriveDesktopError(
            'UNKNOWN',
            `Creating file ${plainName}: ${error}`
          )
        );
      }
    }
  }

  /* @Deprecated use driveServerModule.files.addFileToTrash instead */
  async trash(): Promise<void> {
    /* no-op */
  }

  /* @Deprecated use driveServerModule.files.addFileToTrash instead */
  async delete(): Promise<void> {
    /* no-op */
  }

  /* @Deprecated use driveServerModule.files.renameFile instead */
  async rename(): Promise<void> {
    /* no-op */
  }

  /* @Deprecated use driveServerModule.files.moveFile instead */
  async move(): Promise<void> {
    /* no-op */
  }

  /* @Deprecated use driveServerModule.files.replaceFile instead */
  async override(): Promise<void> {
    /* no-op */
  }
}
