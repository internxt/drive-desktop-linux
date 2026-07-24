declare module 'electron-log' {
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

  const electronLog: ElectronLogModule;

  export default electronLog;
}
