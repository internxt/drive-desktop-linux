import axios, { AxiosError, AxiosResponse } from 'axios';

export function createResponseInterceptor(onUnauthorized: () => void): {
  onFulfilled: (response: AxiosResponse) => AxiosResponse;
  onRejected: (error: AxiosError) => Promise<never>;
} {
  const onFulfilled = (response: AxiosResponse): AxiosResponse => response;

  const onRejected = (error: AxiosError): Promise<never> => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      onUnauthorized();
    }

    return Promise.reject(error);
  };

  return { onFulfilled, onRejected };
}
