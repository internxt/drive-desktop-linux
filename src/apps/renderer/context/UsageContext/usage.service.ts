import { Usage } from '../../../../backend/features/usage/usage.types';
import { Result } from '../../../../context/shared/domain/Result';
import { isError } from '../../../../shared/errors/is-error';

export async function fetchUsage(): Promise<Result<Usage, Error>> {
  try {
    const userIsLoggedIn = await window.electron.isUserLoggedIn();

    if (!userIsLoggedIn) {
      return { error: new Error('User is not logged in') };
    }

    return await window.electron.getUsage();
  } catch (err) {
    const error = isError(err) ? err : new Error('Error getting usage in UsageContext');

    window.electron.logger.error({
      msg: error.message,
      error,
    });
    return { error };
  }
}
