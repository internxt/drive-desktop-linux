import { ABSOLUTE_UPLOAD_FILE_SIZE_LIMIT } from './constants';

export type UploadFileSizeValidation =
  | { allowed: true }
  | {
      allowed: false;
      reason: 'EMPTY_FILE' | 'PLAN_LIMIT_EXCEEDED' | 'ABSOLUTE_CAP_EXCEEDED';
      maxFileSize: number;
      showUpgradeCta: boolean;
    };

type Props = {
  size: number;
  maxUploadFileSize?: number | null;
  allowEmptyFile?: boolean;
};

export function validateUploadFileSize({
  size,
  maxUploadFileSize,
  allowEmptyFile = true,
}: Props): UploadFileSizeValidation {
  if (!allowEmptyFile && size <= 0) {
    return {
      allowed: false,
      reason: 'EMPTY_FILE',
      maxFileSize: 0,
      showUpgradeCta: false,
    };
  }

  if (size > ABSOLUTE_UPLOAD_FILE_SIZE_LIMIT) {
    return {
      allowed: false,
      reason: 'ABSOLUTE_CAP_EXCEEDED',
      maxFileSize: ABSOLUTE_UPLOAD_FILE_SIZE_LIMIT,
      showUpgradeCta: false,
    };
  }

  if (maxUploadFileSize && size > maxUploadFileSize) {
    return {
      allowed: false,
      reason: 'PLAN_LIMIT_EXCEEDED',
      maxFileSize: maxUploadFileSize,
      showUpgradeCta: true,
    };
  }

  return { allowed: true };
}
