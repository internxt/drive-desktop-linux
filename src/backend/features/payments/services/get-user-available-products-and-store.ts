import { onUserUnauthorized } from '../../../../apps/shared/HttpClient/background-process-clients';
import {
  getUserAvailableProductsAndCallback,
  UserAvailableProducts,
} from '@internxt/drive-desktop-core/build/backend';

import { appInfo } from '../../../../apps/main/app-info/app-info';
import { obtainToken } from '../../../../apps/main/auth/service';
import configStore from '../../../../apps/main/config';
import eventBus from '../../../../apps/main/event-bus';
import { getStoredUserProducts } from './get-stored-user-products';

function storeProductsAndEmitEvent(fetchedProducts: UserAvailableProducts) {
  configStore.set('availableUserProducts', fetchedProducts);
  eventBus.emit('USER_AVAILABLE_PRODUCTS_UPDATED', fetchedProducts);
}



export async function getUserAvailableProductsAndStore() {
  const storedProducts = getStoredUserProducts();
  const paymentsClientConfig = {
    paymentsUrl: process.env.PAYMENTS_URL!,
    desktopHeader: process.env.INTERNXT_DESKTOP_HEADER_KEY!,
    clientName: appInfo.name,
    clientVersion: appInfo.version,
    token: obtainToken('newToken'),
    unauthorizedCallback: onUserUnauthorized,
  };
  await getUserAvailableProductsAndCallback({
    storedProducts,
    paymentsClientConfig,
    callbackOnProductsNotEqual: storeProductsAndEmitEvent,
  });
}
