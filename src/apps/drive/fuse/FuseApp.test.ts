vi.mock('@gcas/fuse', () => ({
  default: vi.fn(),
  Fuse: vi.fn().mockImplementation(() => ({
    mount: vi.fn(),
    unmount: vi.fn(),
    ops: {},
  })),
}));

vi.mock('../../main/remote-sync/service', () => ({
  getExistingFiles: vi.fn(),
}));

// Mock the electron-store
vi.mock('../../main/config', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { FuseApp } from './FuseApp';
import { FileRepositorySynchronizer } from '../../../context/virtual-drive/files/application/FileRepositorySynchronizer';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Container } from 'diod';
import { VirtualDrive } from '../virtual-drive/VirtualDrive';

describe('FuseApp', () => {
  let fuseApp: FuseApp;
  let fileRepositoryMock: FileRepositorySynchronizer;

  beforeEach(() => {
    fileRepositoryMock = {} as unknown as FileRepositorySynchronizer;

    const containerMock = {
      get: vi.fn((service) => {
        if (service === FileRepositorySynchronizer) {
          return fileRepositoryMock;
        }
        return null;
      }),
    } as unknown as Container;

    const virtualDriveMock = {} as unknown as VirtualDrive;

    fuseApp = new FuseApp(virtualDriveMock, containerMock, '/local/root', 123, 'ca4391b1-24d9-4e14-b305-e124b0ff5801');

    vi.spyOn(logger, 'debug').mockImplementation(vi.fn());
    vi.spyOn(logger, 'error').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
