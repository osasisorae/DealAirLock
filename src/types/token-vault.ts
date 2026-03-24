export type ConnectedAccount = {
  id: string;
  connection: string;
  access_type?: string;
  scopes: string[];
  created_at?: string;
};

export type TokenVaultStatus = {
  state:
    | "needs_login"
    | "needs_refresh_token"
    | "ready"
    | "connected"
    | "rate_limited"
    | "needs_setup"
    | "error";
  configured: boolean;
  ready: boolean;
  myAccountApiReady: boolean;
  hasRefreshToken: boolean;
  googleConnected: boolean;
  missing: string[];
  title?: string;
  guidance?: string;
  error?: string;
  connectUrl: string;
  accounts: ConnectedAccount[];
};
