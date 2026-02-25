export type AuthHeadersProvider = () => Promise<Record<string, string>> | Record<string, string>;

export interface AuthInterceptorOptions {
  authHeadersProvider?: AuthHeadersProvider;
  onUnauthorized?: () => void;
}
