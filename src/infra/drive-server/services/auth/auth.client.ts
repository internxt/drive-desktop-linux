import createClient, { ClientOptions } from 'openapi-fetch';
import { paths } from '../../../schemas';

const clientOptions: ClientOptions = {
  baseUrl: process.env.NEW_DRIVE_URL
};

export const authClient = createClient<paths>(clientOptions);
