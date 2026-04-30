import { ContainerBuilder } from 'diod';
import { AbsolutePathToRelativeConverter } from '../../../../context/virtual-drive/shared/application/AbsolutePathToRelativeConverter';
import { RelativePathToAbsoluteConverter } from '../../../../context/virtual-drive/shared/application/RelativePathToAbsoluteConverter';
import { PATHS } from '../../../../core/electron/paths';

export async function registerVirtualDriveSharedServices(builder: ContainerBuilder): Promise<void> {
  const downloaded = PATHS.DOWNLOADED;

  builder.register(RelativePathToAbsoluteConverter).useFactory(() => new RelativePathToAbsoluteConverter(downloaded));
  builder.register(AbsolutePathToRelativeConverter).useFactory(() => new AbsolutePathToRelativeConverter(downloaded));
}
