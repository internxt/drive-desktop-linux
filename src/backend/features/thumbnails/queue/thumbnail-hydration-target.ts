import type { File } from '../../../../context/virtual-drive/files/domain/File';
import { getMediaCategory } from '../placeholders/thumbnail-mime';
import { MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES } from '../thumbnail.constants';

type GetThumbnailHydrationTargetBytesProps = {
  readonly file: File;
};

export function getThumbnailHydrationTargetBytes({ file }: GetThumbnailHydrationTargetBytesProps) {
  const fileName = file.nameWithExtension ?? file.name ?? '';
  const category = getMediaCategory({ fileName });

  if (category === 'video') {
    return Math.min(file.size, MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES);
  }

  return file.size;
}
