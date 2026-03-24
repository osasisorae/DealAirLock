import "dotenv/config";

function readEnv(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(readEnv("PORT", "8787")),
  appUrl: readEnv("APP_URL", "http://localhost:5173"),
  apiUrl: readEnv("API_URL", "http://127.0.0.1:8787"),
  sessionSecret: readEnv("SESSION_SECRET", "deal-airlock-dev-session-secret"),
  auth0: {
    domain: readEnv("AUTH0_DOMAIN"),
    clientId: readEnv("AUTH0_CLIENT_ID"),
    clientSecret: readEnv("AUTH0_CLIENT_SECRET"),
    audience: readEnv("AUTH0_AUDIENCE"),
    tokenVaultUrl: readEnv("AUTH0_TOKEN_VAULT_URL"),
    m2mClientId: readEnv("AUTH0_M2M_CLIENT_ID"),
    m2mClientSecret: readEnv("AUTH0_M2M_CLIENT_SECRET"),
  },
  prysm: {
    baseUrl: readEnv("PRYSM_BASE_URL"),
    apiKey: readEnv("PRYSM_API_KEY"),
  },
};

export function buildAuth0Urls() {
  const callbackUrl = `${env.appUrl}/api/auth/callback`;
  const tokenVaultCallbackUrl = `${env.appUrl}/api/token-vault/callback`;
  const logoutReturnTo = env.appUrl;
  return {
    callbackUrl,
    tokenVaultCallbackUrl,
    logoutReturnTo,
    issuerBaseUrl: `https://${env.auth0.domain}`,
    authorizeUrl: `https://${env.auth0.domain}/authorize`,
    tokenUrl: `https://${env.auth0.domain}/oauth/token`,
    userInfoUrl: `https://${env.auth0.domain}/userinfo`,
    logoutUrl: `https://${env.auth0.domain}/v2/logout`,
    myAccountApiAudience: `https://${env.auth0.domain}/me/`,
    myAccountBaseUrl: `https://${env.auth0.domain}/me/v1`,
  };
}
