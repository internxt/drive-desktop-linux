import { registerAppReadyFlow } from './register-app-ready-flow';
import { setupEnvironmentDebugTools } from './setup-environment-debug-tools';
import { registerMainIpcHandlers } from './register-main-ipc-handlers';
import { registerProcessHandlers } from './register-process-handlers';
import { registerSecondInstanceFlow } from './register-second-instance-flow';
import { registerSessionEventHandlers } from './register-session-event-handlers';
import { registerClientCompatibilityHandlers } from '../../backend/features/client-compatibility/register-client-compatibility-handlers';

export function bootstrapMainProcess() {
  setupEnvironmentDebugTools();
  registerClientCompatibilityHandlers();
  registerMainIpcHandlers();
  registerAppReadyFlow();
  registerSecondInstanceFlow();
  registerSessionEventHandlers();
  registerProcessHandlers();
}
