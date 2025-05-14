import { Environment } from '@internxt/inxt-js';
import { getUser } from '../../auth/service';
import { ThumbnailUploader } from '../domain/ThumbnailUploader';
import { EnvironmentAndApiThumbnailUploader } from './EnvironmentAndApiThumbnailUploader';

export class ThumbnailUploaderFactory {
  private static instance: ThumbnailUploader | null;

  static build(): ThumbnailUploader {
    if (ThumbnailUploaderFactory.instance) {
      return ThumbnailUploaderFactory.instance;
    }

    const user = getUser();

    if (!user) {
      throw new Error(
        '[THUMBNAIL] Thumbnail uploader could not be created: user missing'
      );
    }

    const environment = new Environment({
      bridgeUrl: process.env.BRIDGE_URL,
      bridgeUser: user.bridgeUser,
      bridgePass: user.userId,
      encryptionKey: user.mnemonic,
    });


    ThumbnailUploaderFactory.instance =
      new EnvironmentAndApiThumbnailUploader(
        environment,
        user.bucket
      );

    return ThumbnailUploaderFactory.instance;
  }
}
