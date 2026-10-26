import configStore from '../../config';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { isInternxtDrivePath } from './isInternxtDrivePath';

describe('isInternxtDrivePath', () => {
  const configGetMock = partialSpyOn(configStore, 'get');

  beforeEach(() => {
    configGetMock.mockReturnValue('');
  });

  it('should match the default mount and paths inside it', () => {
    expect(isInternxtDrivePath({ pathName: '/mock/home/Internxt Drive' })).toBe(true);
    expect(isInternxtDrivePath({ pathName: '/mock/home/Internxt Drive/Documents/a.txt' })).toBe(true);
  });

  it('should ignore the home directory and a sibling folder with a similar name', () => {
    expect(isInternxtDrivePath({ pathName: '/mock/home' })).toBe(false);
    expect(isInternxtDrivePath({ pathName: '/mock/home/Internxt Drive Backup' })).toBe(false);
  });

  it('should use a configured parent folder as the mount location', () => {
    configGetMock.mockReturnValue('/data/sync/');

    expect(isInternxtDrivePath({ pathName: '/data/sync/Internxt Drive/photo.png' })).toBe(true);
    expect(isInternxtDrivePath({ pathName: '/mock/home/Internxt Drive' })).toBe(false);
  });

  it('should use the configured path when it is already the mount folder', () => {
    configGetMock.mockReturnValue('/mnt/cloud/Internxt Drive');

    expect(isInternxtDrivePath({ pathName: '/mnt/cloud/Internxt Drive' })).toBe(true);
    expect(isInternxtDrivePath({ pathName: '/mnt/cloud/Internxt Drive/notes' })).toBe(true);
    expect(isInternxtDrivePath({ pathName: '/mnt/cloud' })).toBe(false);
  });
});
