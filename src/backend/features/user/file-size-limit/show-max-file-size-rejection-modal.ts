import { logger } from '@internxt/drive-desktop-core/build/backend';

export type MaxFileSizeRejectionModalPayload = {
  variant: 'single' | 'multiple';
  showUpgradeCta: boolean;
  maxFileSize?: number;
  fileSize?: number;
};

export async function showMaxFileSizeRejectionModal(payload: MaxFileSizeRejectionModalPayload): Promise<void> {
  logger.warn({
    msg: 'TODO: Showing max file size rejection modal',
    payload,
  });
}
