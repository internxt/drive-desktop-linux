import { INTERNXT_CLIENT, INTERNXT_VERSION } from './../../../../core/utils/utils';
import { ContainerBuilder } from 'diod';
import { getUserOrThrow } from '../../../../backend/features/auth/get-user-or-throw';
import { Environment } from '@internxt/inxt-js';
import { getCredentials } from '../../../main/auth/get-credentials';

export function registerLocalFileServices(builder: ContainerBuilder) {
  //Infra
  const user = getUserOrThrow();

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
