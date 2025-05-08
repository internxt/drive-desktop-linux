import { Environment } from '@internxt/inxt-js';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { Readable } from 'stream';

import { ThumbnailProperties } from '../domain/ThumbnailProperties';
import { ThumbnailUploader } from '../domain/ThumbnailUploader';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';

export class EnvironmentAndStorageThumbnailUploader
  implements ThumbnailUploader
{
  constructor(
    private readonly environment: Environment,
    private readonly bucket: string
  ) {}

  private uploadThumbnail(thumbnail: Buffer) {
    const thumbnailStream = new Readable({
      read() {
        this.push(thumbnail);
        this.push(null);
      },
    });

    return new Promise<string>((resolve, reject) => {
      this.environment.upload(this.bucket, {
        progressCallback: () => {
          // no op
        },
        finishedCallback: (err: unknown, id: string) => {
          if (err && !id) {
            reject(err);
          }

          resolve(id);
        },
        fileSize: thumbnail.byteLength,
        source: thumbnailStream,
      });
    });
  }

  async upload(fileId: number, thumbnailFile: Buffer): Promise<void> {
    const fileIdOnEnvironment = await this.uploadThumbnail(thumbnailFile);

    await driveServerModule.files.createThumbnail({
      fileId,
      type: ThumbnailProperties.type as string,
      size: thumbnailFile.byteLength,
      maxWidth: ThumbnailProperties.dimensions as number,
      maxHeight: ThumbnailProperties.dimensions as number,
      bucketId: this.bucket,
      bucketFile: fileIdOnEnvironment,
      encryptVersion: StorageTypes.EncryptionVersion.Aes03,
    });
  }
}
