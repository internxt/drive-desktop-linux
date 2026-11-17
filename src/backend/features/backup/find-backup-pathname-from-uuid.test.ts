import configStoreModule from '../../../apps/main/config';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { findBackupPathnameFromUuid } from './find-backup-pathname-from-uuid';

describe('find-backup-pathname-from-uuid', () => {
  const configStoreGetMock = partialSpyOn(configStoreModule, 'get');

  it('should return pathname when backup uuid exists', () => {
    configStoreGetMock.mockReturnValue({
      '/home/dev/Documents': { enabled: true, folderUuid: 'uuid-1' },
      '/home/dev/Pictures': { enabled: true, folderUuid: 'uuid-2' },
    });

    const result = findBackupPathnameFromUuid({ folderUuid: 'uuid-2' });

    expect(result).toBe('/home/dev/Pictures');
  });

  it('should return undefined when backup uuid does not exist', () => {
    configStoreGetMock.mockReturnValue({
      '/home/dev/Documents': { enabled: true, folderUuid: 'uuid-1' },
    });

    const result = findBackupPathnameFromUuid({ folderUuid: 'unknown-uuid' });

    expect(result).toBeUndefined();
  });
});
