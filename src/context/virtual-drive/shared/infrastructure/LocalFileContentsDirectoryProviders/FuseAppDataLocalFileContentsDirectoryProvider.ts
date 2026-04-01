import { Service } from 'diod';
import { PATHS } from '../../../../../core/electron/paths';
import { LocalFileContentsDirectoryProvider } from '../../domain/LocalFileContentsDirectoryProvider';

@Service()
export class FuseAppDataLocalFileContentsDirectoryProvider implements LocalFileContentsDirectoryProvider {

  provide(): Promise<string> {
    return Promise.resolve(PATHS.INTERNXT_DRIVE);
  }
}
