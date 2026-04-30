import { ipcMain } from 'electron';

export function getIpcHandler(eventName: string, useOn = false) {
  const ipc = ipcMain as unknown as {
    handle: { mock: { calls: Array<[string, (...args: unknown[]) => unknown]> } };
    on: { mock: { calls: Array<[string, (...args: unknown[]) => unknown]> } };
  };

  const calls = useOn ? ipc.on.mock.calls : ipc.handle.mock.calls;

  return calls.find(([name]) => name === eventName)?.[1];
}