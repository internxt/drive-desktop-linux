import { rejectedUploadsForSize } from './rejected-uploads-for-size';

export function unregisterRejectedUploadForSize({ path }: { path: string }) {
  rejectedUploadsForSize().delete(path);
}
