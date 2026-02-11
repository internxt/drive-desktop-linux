import { Environment } from '@internxt/inxt-js';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { Readable } from 'stream';
import { ThumbnailConfig } from '../domain/ThumbnailProperties';
import { ThumbnailUploader } from '../domain/ThumbnailUploader';
import { createThumbnail } from '../../../../infra/drive-server/services/files/services/create-thumbnail';
import { CreateThumbnailDto } from '../../../../infra/drive-server/out/dto';

export class EnvironmentAndStorageThumbnailUploader implements ThumbnailUploader {
  constructor(
    private readonly environment: Environment,
    private readonly bucket: string,
  ) {}

  private uploadThumbnailToEnvironment(thumbnail: Buffer) {
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

  private async uploadThumbnailToStorage(thumbnail: CreateThumbnailDto) {
    return await createThumbnail(thumbnail);
  }

  async upload(fileId: number, thumbnailFile: Buffer): Promise<void> {
    const fileIdOnEnvironment = await this.uploadThumbnailToEnvironment(thumbnailFile);
    await this.uploadThumbnailToStorage({
      // I add this comment just because ts is complaining and this method is not being actually used.
      fileUuid: '',
      fileId,
      type: ThumbnailConfig.Type as string,
      size: thumbnailFile.byteLength,
      maxWidth: ThumbnailConfig.MaxWidth as number,
      maxHeight: ThumbnailConfig.MaxHeight as number,
      bucketId: this.bucket,
      bucketFile: fileIdOnEnvironment,
      encryptVersion: StorageTypes.EncryptionVersion.Aes03,
    });
  }
}
