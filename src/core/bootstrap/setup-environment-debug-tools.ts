import electronDebug from 'electron-debug';
import { install } from 'source-map-support';

export function setupEnvironmentDebugTools() {
  if (process.env.NODE_ENV === 'production') {
    install();
  }

  if (process.env.NODE_ENV === 'development') {
    electronDebug({ showDevTools: false });
  }
}
