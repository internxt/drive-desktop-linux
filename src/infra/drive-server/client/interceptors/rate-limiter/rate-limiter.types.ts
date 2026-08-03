import { AxiosError, AxiosResponse } from 'axios';

export type RateLimitState = {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
};
export type DelayState = {
  pendingByKey: Record<string, Promise<void>>;
};

export type ResponseInterceptor = {
  onFulfilled: (response: AxiosResponse) => AxiosResponse;
  onRejected: (error: AxiosError) => Promise<AxiosResponse | never>;
};
