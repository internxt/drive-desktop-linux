import { AuthService } from './auth.service';
import { authClient } from './auth.client';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { logger } from '../../../../core/LoggerService/LoggerService';

jest.mock('../../../../apps/main/auth/service', () => ({
  getNewApiHeaders: jest.fn()
}));

jest.mock('./auth.client', () => ({
  authClient: {
    GET: jest.fn()
  }
}));

jest.mock('../../../../core/LoggerService/LoggerService', () => ({
  logger: {
    error: jest.fn()
  }
}));

describe('AuthService', () => {
  let sut: AuthService;

  beforeEach(() => {
    sut = new AuthService();
    jest.clearAllMocks();
  });

  describe('refresh', () => {
    it('should return token and newToken when response is succesful', async () => {
      const data = { token: 'token', newToken: 'newToken' };
      (authClient.GET as jest.Mock).mockResolvedValue({ data });
      const mockedHeaders: Record<string, string> = {
        Authorization: 'Bearer newToken',
        'content-type': 'application/json; charset=utf-8',
        'internxt-client': 'drive-desktop',
        'internxt-version': '2.4.8',
        'x-internxt-desktop-header': 'test-header',
      };
      (getNewApiHeaders as jest.Mock).mockResolvedValue(mockedHeaders);
      const result = await sut.refresh();

      expect(result.isRight()).toEqual(true);
      expect(result.getRight()).toEqual(data);
      expect(authClient.GET).toHaveBeenCalledWith('/users/refresh', { headers: mockedHeaders });
    });

    it('should return error when response is not successful', async () => {
      (authClient.GET as jest.Mock).mockResolvedValue({ data: undefined });

      const result = await sut.refresh();

      expect(result.isLeft()).toBe(true);


      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Refresh request was not successful');

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Refresh request was not successful',
          tag: 'AUTH',
          attributes: expect.objectContaining({
            endpoint: '/users/refresh'
          })
        })
      );
    });

    it('should return error when request throws an exception', async () => {
      const error = new Error('Request failed');
      (authClient.GET as jest.Mock).mockRejectedValue(error);

      const result = await sut.refresh();

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toEqual(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Login request threw an exception',
          tag: 'AUTH',
          error: error,
          attributes: expect.objectContaining({
            endpoint: '/auth/login'
          })
        })
      );
    });
  });
});
