import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as configModule from '../../apps/main/config';
import { PATHS } from '../../core/electron/paths';
import { resolveInternxtMountPath } from './resolve-internxt-mount-path';

describe('resolveInternxtMountPath', () => {
  const configGetMock = vi.spyOn(configModule.default, 'get');

  beforeEach(() => {
    configGetMock.mockReset();
  });

  it('uses default home mount when virtualDriveRoot is empty', () => {
    configGetMock.mockReturnValue('');

    expect(resolveInternxtMountPath()).toBe(PATHS.ROOT_DRIVE_FOLDER);
  });

  it('appends Internxt Drive folder name when config is the sync root parent', () => {
    configGetMock.mockReturnValue('/data/sync');

    expect(resolveInternxtMountPath()).toBe(`/data/sync/${PATHS.VIRTUAL_DRIVE_FOLDER_NAME}`);
  });

  it('returns config path when it already points at the mount folder', () => {
    configGetMock.mockReturnValue(`/mnt/cloud/${PATHS.VIRTUAL_DRIVE_FOLDER_NAME}`);

    expect(resolveInternxtMountPath()).toBe(`/mnt/cloud/${PATHS.VIRTUAL_DRIVE_FOLDER_NAME}`);
  });
});
