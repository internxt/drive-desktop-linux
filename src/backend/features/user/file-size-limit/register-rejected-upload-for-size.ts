import { RejectedUploadSizeKind, rejectedUploadsForSize } from './rejected-uploads-for-size';

type Props = {
  path: string;
  kind: RejectedUploadSizeKind;
};

export function registerRejectedUploadForSize({ path, kind }: Props) {
  rejectedUploadsForSize().set(path, kind);
}
