import { app, ipcMain } from 'electron';
import { call } from 'tests/vitest/utils.helper';
import * as driveModule from '../../apps/drive';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import * as registerQuitHandlerModule from './quit.handler';

describe('quit', () => {
  const stopAndClearFuseAppMock = partialSpyOn(driveModule, 'stopAndClearFuseApp');
  const appQuitMock = partialSpyOn(app, 'quit');
  const ipcMainOnMock = partialSpyOn(ipcMain, 'on', false);
  const registerQuitHandlerMock = partialSpyOn(registerQuitHandlerModule, 'registerQuitHandler');

  beforeEach(() => {
    registerQuitHandlerMock.mockRestore();
    stopAndClearFuseAppMock.mockResolvedValue(undefined);
  });

  it('should register user-quit handler', () => {
    registerQuitHandlerModule.registerQuitHandler();

    call(ipcMainOnMock).toMatchObject(['user-quit', expect.any(Function)]);
  });

  it('should call stopAndClearFuseApp on user-quit event', async () => {
    registerQuitHandlerModule.registerQuitHandler();
    await (ipcMainOnMock.mock.calls[0][1] as () => Promise<void>)();

    expect(stopAndClearFuseAppMock).toBeCalled();
  });

  it('should call app.quit on user-quit event', async () => {
    registerQuitHandlerModule.registerQuitHandler();
    await (ipcMainOnMock.mock.calls[0][1] as () => Promise<void>)();

    expect(appQuitMock).toBeCalled();
  });
});
