import { Container } from 'diod';
import { Result } from '../../../../../context/shared/domain/Result';
import { GetXAttrCallbackData } from '../../constants';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { isLocallyAvailable } from '../../../../../context/virtual-drive/shared/application/path-local-availability-checker';

const STATUS_ON_LOCAL = 'on_local';
const STATUS_ON_REMOTE = 'on_remote';

export async function getXAttr(
  path: string,
  _attr: string,
  container: Container,
): Promise<Result<GetXAttrCallbackData, FuseError>> {
  if (path === '/' || path === '') {
    return { error: new FuseError(FuseCodes.ENOSYS, 'Cannot get the status of root folder') };
  }

  const locallyAvailable = await isLocallyAvailable({ path, container });

  if (locallyAvailable) {
    return { data: { value: STATUS_ON_LOCAL } };
  }

  return { data: { value: STATUS_ON_REMOTE } };
}
