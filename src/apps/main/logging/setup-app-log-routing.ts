import { join } from 'node:path';
import { createRequire } from 'node:module';

type Pops = {
  logsPath: string;
};

type LogMessage = {
  data?: unknown[];
  level?: string;
};

type StructuredLogEntry = {
  tag?: unknown;
  header?: unknown;
  msg?: unknown;
  message?: unknown;
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
const ANTIVIRUS_STRUCTURED_HEADER_PATTERN = /-\s*anti\b/i;
const ANTIVIRUS_MESSAGE_PATTERNS = [
  /\[CLAM_AVD\]/,
  /\[freshclam/i,
  /\[ANTIVIRUS_MANAGER\]/,
  /window\.electron\.antivirus/i,
  /\bclamd?\b/i,
  /\bantivirus\b/i,
];

/**
 * Esteban Galvis Triana
 * v2.6.0
 * Resolve electron-log from @internxt/drive-desktop-core package context.
 * This guarantees we patch the same logger instance used by setupElectronLog()
 * and avoids depending on a root-level electron-log dependency.
 */
function getCoreElectronLog() {
  const coreRequire = createRequire(require.resolve('@internxt/drive-desktop-core/package.json'));
  return coreRequire('electron-log') as ElectronLogModule;
}

const typedCoreElectronLog = getCoreElectronLog();

function isSerializedAntivirusLogEntry({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return false;
  }

  return ANTIVIRUS_HEADER_PATTERN.test(value) || ANTIVIRUS_MESSAGE_PATTERNS.some((pattern) => pattern.test(value));
}

function isStructuredLogEntry(value: unknown): value is StructuredLogEntry {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStructuredAntivirusLogEntry({ value }: { value: unknown }) {
  if (!isStructuredLogEntry(value)) {
    return false;
  }

  const { tag, header, msg, message } = value;
  const hasAntivirusTag = typeof tag === 'string' && (tag === 'ANTIVIRUS' || tag === 'anti');
  const hasAntivirusHeader = typeof header === 'string' && ANTIVIRUS_STRUCTURED_HEADER_PATTERN.test(header);
  const hasAntivirusMessage =
    (typeof msg === 'string' && ANTIVIRUS_MESSAGE_PATTERNS.some((pattern) => pattern.test(msg))) ||
    (typeof message === 'string' && ANTIVIRUS_MESSAGE_PATTERNS.some((pattern) => pattern.test(message)));

  return hasAntivirusTag || hasAntivirusHeader || hasAntivirusMessage;
}

function isAntivirusLogMessage({ message }: { message?: LogMessage }) {
  return (
    message?.data?.some((value) => {
      return isSerializedAntivirusLogEntry({ value }) || isStructuredAntivirusLogEntry({ value });
    }) ?? false
  );
}

export function resolveAppLogFilePath({ logsPath, message }: Pops & { message?: LogMessage }) {
  if (message?.level === 'error' || message?.level === 'info') {
    return join(logsPath, IMPORTANT_LOG_FILE_NAME);
  }

  if (isAntivirusLogMessage({ message })) {
    return join(logsPath, ANTIVIRUS_LOG_FILE_NAME);
  }

  return join(logsPath, DEFAULT_LOG_FILE_NAME);
}

export function setupAppLogRouting({ logsPath }: Pops) {
  typedCoreElectronLog.transports.file.resolvePathFn = (_, message) => {
    return resolveAppLogFilePath({ logsPath, message });
  };

  typedCoreElectronLog.transports.file.resolvePath = typedCoreElectronLog.transports.file.resolvePathFn;
}
