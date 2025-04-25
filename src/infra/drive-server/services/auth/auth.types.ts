export interface RefreshTokenResponse {
  token: string;
  newToken: string;
}

export interface LoginResponse {
  hasKeys: boolean;
  sKey: string;
  tfa: boolean;
  hasKyberKeys: boolean;
  hasEccKeys: boolean;
}
