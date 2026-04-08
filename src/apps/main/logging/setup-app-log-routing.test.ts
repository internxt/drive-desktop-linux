import { resolveAppLogFilePath } from './setup-app-log-routing';

describe('setup-app-log-routing', () => {
  const logsPath = '/tmp/internxt-logs';

  describe('resolveAppLogFilePath', () => {
    it('should route antivirus debug logs to the dedicated antivirus file', () => {
      // When
      const result = resolveAppLogFilePath({
        logsPath,
        message: {
          level: 'debug',
          data: ["{ header: '  - b - anti', msg: '[CLAM_AVD] Starting clamd server...' }"],
        },
      });

      // Then
      expect(result).toBe('/tmp/internxt-logs/drive-antivirus.log');
    });

    it('should keep important logs in the important file even for antivirus entries', () => {
      // When
      const result = resolveAppLogFilePath({
        logsPath,
        message: {
          level: 'info',
          data: ["{ header: 'E - b - anti', msg: '[CLAM_AVD] clamd process unexpectedly exited' }"],
        },
      });

      // Then
      expect(result).toBe('/tmp/internxt-logs/drive-important.log');
    });

    it('should keep non-antivirus logs in the main log file', () => {
      // When
      const result = resolveAppLogFilePath({
        logsPath,
        message: {
          level: 'debug',
          data: ["{ header: '  - b - auth', msg: 'Starting app' }"],
        },
      });

      // Then
      expect(result).toBe('/tmp/internxt-logs/drive.log');
    });

    it('should route antivirus messages even when the serialized header is missing the antivirus tag', () => {
      // When
      const result = resolveAppLogFilePath({
        logsPath,
        message: {
          level: 'debug',
          data: ["{ header: '  - b -     ', msg: '[Main] Antivirus IPC handlers setup complete' }"],
        },
      });

      // Then
      expect(result).toBe('/tmp/internxt-logs/drive-antivirus.log');
    });
  });
});