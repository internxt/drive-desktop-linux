import { FuseCode } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';

type Props = {
  code: FuseCode;
  folderPath: string;
  canUseCachedChildren: boolean;
};

export class DirectoryMetadataSyncError extends FuseError {
  constructor({ code, folderPath, canUseCachedChildren }: Props) {
    super(code, `[FUSE - Metadata sync] Unable to synchronize directory metadata: ${folderPath}`);
    this.canUseCachedChildren = canUseCachedChildren;
  }

  readonly canUseCachedChildren: boolean;
}
