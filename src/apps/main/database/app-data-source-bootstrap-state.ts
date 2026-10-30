let isAppDataSourceBootstrapComplete = false;

export function getIsAppDataSourceBootstrapComplete() {
  return isAppDataSourceBootstrapComplete;
}

export function setAppDataSourceBootstrapComplete(value: boolean) {
  isAppDataSourceBootstrapComplete = value;
}

export function resetAppDataSourceBootstrapState() {
  isAppDataSourceBootstrapComplete = false;
}
