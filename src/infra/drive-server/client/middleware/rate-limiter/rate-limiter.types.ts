export type RateLimitState = {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
};
export type DelayState = { pending: Promise<void> | null };
