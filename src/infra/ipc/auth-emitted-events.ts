import { driveServerModule } from '../drive-server/drive-server.module';

export type EmittedEvents = {
  'auth:login': (
    props: Parameters<(typeof driveServerModule)['auth']['login']>[0],
  ) => ReturnType<(typeof driveServerModule)['auth']['login']>;
};
