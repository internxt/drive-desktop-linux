import { FileSizeLimitModule, UploadFileSizeValidation } from '@internxt/drive-desktop-core/build/backend';

import { addMaxFileSizeRejection } from './add-max-file-size-rejection';
import { getFileSizeLimitAdapter } from './get-file-size-limit-adapter';
import { registerRejectedUploadForSize } from './register-rejected-upload-for-size';
import { RejectedUploadSizeKind } from './rejected-uploads-for-size';

type Props = {
  path: string;
  fileSize: number;
  kind: RejectedUploadSizeKind;
  validation?: Extract<UploadFileSizeValidation, { allowed: false }>;
  blockUploadPath?: boolean;
};

export function handleUploadFileSizeLimitExceeded({ path, fileSize, kind, validation, blockUploadPath }: Props) {
  addMaxFileSizeRejection({ path, fileSize, validation, blockUploadPath });
  registerRejectedUploadForSize({ path, kind });
  void FileSizeLimitModule.revalidateFileSizeLimit(getFileSizeLimitAdapter());
}
