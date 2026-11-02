import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import * as openHttpsUrlModule from './open-https-url';
import './handlers';

describe('handlers', () => {
  const openHttpsUrlMock = partialSpyOn(openHttpsUrlModule, 'openHttpsUrl');
  let handler: ((event: IpcMainInvokeEvent, url: string) => unknown) | undefined;

  beforeAll(() => {
    const registered = vi.mocked(ipcMain.handle).mock.calls.find(([channel]) => channel === 'open-url');
    handler = registered?.[1];
  });

  it('should open the url received on open-url', async () => {
    // When
    await handler?.({} as IpcMainInvokeEvent, 'https://drive.internxt.com');

    // Then
    call(openHttpsUrlMock).toStrictEqual({ url: 'https://drive.internxt.com' });
  });
});
