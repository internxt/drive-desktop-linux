/**
 * Simple logger utility for backups
 */

let logger: {
  debug: (body: { tag?: string; msg: string; [key: string]: unknown }) => void;
  warn: (body: { tag?: string; msg: string; [key: string]: unknown }) => void;
  error: (body: { tag?: string; msg: string; [key: string]: unknown }) => void;
};

if (typeof window !== 'undefined' && 
    typeof (window as { electron?: { logger?: unknown } }).electron?.logger === 'object') {
  // Renderer process - use window.electron.logger
  const electronLogger = (window as { electron: { logger: typeof logger } }).electron.logger;
  logger = electronLogger;
} else {
  // Main process - use direct import
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logger: mainLogger } = require('@internxt/drive-desktop-core/build/backend');
    logger = mainLogger;
  } catch {
    // Fallback to console
    logger = {
      debug: (body) => console.log('[BACKUPS]', body.msg, body),
      warn: (body) => console.warn('[BACKUPS]', body.msg, body), 
      error: (body) => console.error('[BACKUPS]', body.msg, body)
    };
  }
}

export { logger };