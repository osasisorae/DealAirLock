import type { TokenVaultStatus } from "../src/types/token-vault";
import "express-session";

declare module "express-session" {
  interface SessionData {
    auth0State?: string;
    authUser?: {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };
    authTokens?: {
      accessToken?: string;
      idToken?: string;
      refreshToken?: string;
    };
    tokenVault?: {
      googleAuthSession?: string;
      googleState?: string;
      lastConnectedAccountId?: string;
      lastError?: string;
      cachedStatus?: TokenVaultStatus;
      checkedAt?: number;
    };
  }
}
