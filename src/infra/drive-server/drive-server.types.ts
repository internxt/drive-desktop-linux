export type AuthHeadersProvider = () => Promise<Record<string, string>> | Record<string, string>;

export interface ClientOptions {
  baseUrl: string;
  onUnauthorized?: () => void;
  authHeadersProvider?: AuthHeadersProvider;
}