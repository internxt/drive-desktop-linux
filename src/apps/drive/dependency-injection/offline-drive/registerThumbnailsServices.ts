import { ContainerBuilder } from 'diod';
import os from 'node:os';
import path from 'node:path';
import { ThumbnailSynchronizer } from '../../../../context/storage/thumbnails/application/sync/ThumbnailSynchronizer';
import { LocalThumbnailRepository } from '../../../../context/storage/thumbnails/infrastructrue/local/LocalThumbnsailsRepository';
import { SystemThumbnailNameCalculator } from '../../../../context/storage/thumbnails/infrastructrue/local/SystemThumbnailNameCalculator';
import { RelativePathToAbsoluteConverter } from '../../../../context/virtual-drive/shared/application/RelativePathToAbsoluteConverter';

export async function registerThumbnailsServices(builder: ContainerBuilder) {
  builder.registerAndUse(SystemThumbnailNameCalculator);

  builder.register(ThumbnailSynchronizer).useFactory((c) => {
    const pathConverter = c.get(RelativePathToAbsoluteConverter);

    const local = new LocalThumbnailRepository(
      pathConverter,
      c.get(SystemThumbnailNameCalculator),
      path.join(os.homedir(), '.cache', 'thumbnails'),
    );

    local.init();

    return new ThumbnailSynchronizer(local);
  });
}
