import { createRequire } from 'node:module';
import { join } from 'node:path';

type Pops = {
  logsPath: string;
};

type LogMessage = {
  data?: unknown[];
  level?: string;
};

type ElectronLogModule = {
  transports: {
    file: {
      resolvePathFn: (variables: unknown, message?: LogMessage) => string;
      resolvePath?: (variables: unknown, message?: LogMessage) => string;
    };
  };
};

const DEFAULT_LOG_FILE_NAME = 'drive.log';
const IMPORTANT_LOG_FILE_NAME = 'drive-important.log';
const ANTIVIRUS_LOG_FILE_NAME = 'drive-antivirus.log';
const ANTIVIRUS_HEADER_PATTERN = /header:\s'[^']*-\santi'/;
const ANTIVIRUS_MESSAGE_PATTERNS = [
  /\[CLAM_AVD\]/,
  /\[freshclam/i,
  /\[ANTIVIRUS_MANAGER\]/,
  /window\.electron\.antivirus/i,
  /\bantivirus\b/i,
];
const ELECTRON_LOG_MODULE_IDS = ['electron-log', '@internxt/drive-desktop-core/node_modules/electron-log'];
const moduleRequire = createRequire(__filename);

function isSerializedAntivirusLogEntry({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return false;
  }

  return ANTIVIRUS_HEADER_PATTERN.test(value) || ANTIVIRUS_MESSAGE_PATTERNS.some((pattern) => pattern.test(value));
}

function isAntivirusLogMessage({ message }: { message?: LogMessage }) {
  return message?.data?.some((value) => isSerializedAntivirusLogEntry({ value })) ?? false;
}

export function resolveAppLogFilePath({ logsPath, message }: Pops & { message?: LogMessage }) {
  if (message?.level === 'error') {
    return join(logsPath, IMPORTANT_LOG_FILE_NAME);
  }

  if (isAntivirusLogMessage({ message })) {
    return join(logsPath, ANTIVIRUS_LOG_FILE_NAME);
  }

  return join(logsPath, DEFAULT_LOG_FILE_NAME);
}

function getElectronLogModules() {
  const modules = new Map<string, ElectronLogModule>();

  for (const moduleId of ELECTRON_LOG_MODULE_IDS) {
    try {
      const electronLog = moduleRequire(moduleId) as ElectronLogModule;
      const resolvedModulePath = moduleRequire.resolve(moduleId);
      modules.set(resolvedModulePath, electronLog);
    } catch {
      continue;
    }
  }

  return [...modules.values()];
}

export function setupAppLogRouting({ logsPath }: Pops) {
  for (const electronLog of getElectronLogModules()) {
    electronLog.transports.file.resolvePathFn = (_, message) => {
      return resolveAppLogFilePath({ logsPath, message });
    };

    electronLog.transports.file.resolvePath = electronLog.transports.file.resolvePathFn;
  }
}
