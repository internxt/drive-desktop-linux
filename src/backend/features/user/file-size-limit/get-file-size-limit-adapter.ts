import { FileSizeLimitAdapter } from '@internxt/drive-desktop-core/build/backend';

import { electronStore } from '../../../../apps/main/config';
import { resolveUserFileSizeLimit } from './resolve-user-file-size-limit';
import { retryRejectedUploads } from './retry-rejected-uploads';

export function getFileSizeLimitAdapter(): FileSizeLimitAdapter {
  return {
    getStoredLimit: () => electronStore.get('maxUploadFileSizeInBytes'),
    saveLimit: ({ limit }) => {
      const previousLimit = electronStore.get('maxUploadFileSizeInBytes');
      electronStore.set('maxUploadFileSizeInBytes', limit);
      if (limit > previousLimit) void retryRejectedUploads();
    },
    getLastRevalidatedAt: () => electronStore.get('fileSizeLimitRevalidatedAt'),
    saveLastRevalidatedAt: ({ timestamp }) => electronStore.set('fileSizeLimitRevalidatedAt', timestamp),
    fetchLimit: () => resolveUserFileSizeLimit({ signal: AbortSignal.timeout(10_000) }),
  };
}
