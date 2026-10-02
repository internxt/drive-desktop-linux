import { INTERNXT_CLIENT, INTERNXT_VERSION } from './../../../../core/utils/utils';
import { ContainerBuilder } from 'diod';
import { getUser } from '../../../../backend/features/auth/get-user';
import { Environment } from '@internxt/inxt-js';
import { getCredentials } from '../../../main/auth/get-credentials';

export function registerLocalFileServices(builder: ContainerBuilder) {
  //Infra
  const { data: user, error } = getUser();
  if (error) throw error;

  const { mnemonic } = getCredentials();

  const environment = new Environment({
    bridgeUrl: process.env.BRIDGE_URL,
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: mnemonic,
    appDetails: {
      clientName: INTERNXT_CLIENT,
      clientVersion: INTERNXT_VERSION,
      desktopHeader: process.env.INTERNXT_DESKTOP_HEADER_KEY,
    },
  });

  builder.register(Environment).useInstance(environment);
}
