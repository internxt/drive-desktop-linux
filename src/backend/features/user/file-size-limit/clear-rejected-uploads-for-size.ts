import { rejectedUploadsForSize } from './rejected-uploads-for-size';

export function clearRejectedUploadsForSize() {
  rejectedUploadsForSize().clear();
}
