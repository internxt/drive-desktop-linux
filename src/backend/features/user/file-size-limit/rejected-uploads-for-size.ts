export type RejectedUploadSizeKind = 'virtual-drive' | 'backup';

const uploads = new Map<string, RejectedUploadSizeKind>();

export function rejectedUploadsForSize() {
  return uploads;
}
