import { paths } from '../../schemas';
import Bottleneck from 'bottleneck';
import eventBus from '../../../apps/main/event-bus';
import { ClientOptions, createClient } from '../drive-server.client';


function handleOnUserUnauthorized(): void {
  eventBus.emit('USER_LOGGED_OUT');
}

const limiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 500,
});


const clientOptions: ClientOptions = {
  baseUrl: process.env.NEW_DRIVE_URL || '',
  limiter,
  onUnauthorized: handleOnUserUnauthorized,
};

export const driveServerClient = createClient<paths>(clientOptions);
