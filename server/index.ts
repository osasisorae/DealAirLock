import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import session from "express-session";
import { scenarios } from "../src/data/scenarios";
import { buildAuth0Urls, env } from "./env";
import type { ConnectedAccount, TokenVaultStatus } from "../src/types/token-vault";
import type { ActionExecution, IntegrationStatus, Scenario, WorkflowRun } from "../src/types/workflow";
import { approveCurrentAction, createRun, rejectCurrentAction } from "../src/lib/workflow";
import { clearActiveRunInStore, persistRun, readStore, writeStore } from "./store";

const app = express();
const auth0Urls = buildAuth0Urls();
const tokenVaultStatusTtlMs = 60_000;

class ApiError extends Error {
  status: number;
  detail?: string;
  title?: string;

  constructor(message: string, status: number, detail?: string, title?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.title = title;
  }
}

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  }),
);

async function postJson<T>(url: string, data: unknown, accessToken?: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    let title: string | undefined;
    try {
      const parsed = JSON.parse(body) as { detail?: string; title?: string; message?: string };
      detail = parsed.detail ?? parsed.message ?? body;
      title = parsed.title;
    } catch {
      // Keep raw body as detail.
    }
    throw new ApiError(detail || `Request failed with ${response.status}`, response.status, detail, title);
  }

  return (await response.json()) as T;
}

async function getJson<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    let title: string | undefined;
    try {
      const parsed = JSON.parse(body) as { detail?: string; title?: string; message?: string };
      detail = parsed.detail ?? parsed.message ?? body;
      title = parsed.title;
    } catch {
      // Keep raw body as detail.
    }
    throw new ApiError(detail || `Request failed with ${response.status}`, response.status, detail, title);
  }

  return (await response.json()) as T;
}

async function deleteJson(url: string, accessToken: string) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok && response.status !== 204) {
    const body = await response.text();
    throw new ApiError(body || `Request failed with ${response.status}`, response.status, body);
  }
}

async function getMyAccountApiToken(request: express.Request) {
  const refreshToken = request.session.authTokens?.refreshToken;

  if (!refreshToken) {
    throw new Error("No refresh token available from Auth0 login. Check offline_access and MRRT.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.auth0.clientId,
    client_secret: env.auth0.clientSecret,
    refresh_token: refreshToken,
    audience: auth0Urls.myAccountApiAudience,
    scope:
      "openid profile offline_access create:me:connected_accounts read:me:connected_accounts delete:me:connected_accounts",
  });

  const response = await fetch(auth0Urls.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
  };
}

async function getGoogleAccessToken(request: express.Request, scopes: string[]) {
  const refreshToken = request.session.authTokens?.refreshToken;

  if (!refreshToken) {
    throw new ApiError("No Auth0 refresh token available for Token Vault exchange.", 401);
  }

  const body = new URLSearchParams({
    grant_type: "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
    client_id: env.auth0.clientId,
    client_secret: env.auth0.clientSecret,
    subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
    subject_token: refreshToken,
    requested_token_type: "http://auth0.com/oauth/token-type/federated-connection-access-token",
    connection: "google-oauth2",
    scope: scopes.join(" "),
    ...(request.session.authUser?.email ? { login_hint: request.session.authUser.email } : {}),
  });

  const response = await fetch(auth0Urls.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || "Unable to exchange Token Vault token.", response.status, detail);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    issued_token_type?: string;
    token_type: string;
  };
}

function encodeGmailRawMessage(params: {
  to: string;
  from?: string;
  subject: string;
  text: string;
}) {
  const lines = [
    `To: ${params.to}`,
    ...(params.from ? [`From: ${params.from}`] : []),
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${params.subject}`,
    "",
    params.text,
  ];

  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendGmailMessage(args: {
  accessToken: string;
  to: string;
  from?: string;
  subject: string;
  text: string;
}) {
  const raw = encodeGmailRawMessage(args);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(detail || "Unable to send Gmail message.", response.status, detail);
  }

  return (await response.json()) as { id: string; threadId?: string; labelIds?: string[] };
}

async function executeApprovedAction(request: express.Request, run: WorkflowRun) {
  const action = run.actions.find((entry) => entry.status === "awaiting_approval");
  if (!action) {
    return null;
  }

  if (!request.session.authUser?.email) {
    throw new ApiError("Authenticated operator email is required before executing approved actions.", 401);
  }

  if (!action.auth0Scopes.includes("gmail.send")) {
    const skipped: ActionExecution = {
      connector: action.connector,
      executedAt: new Date().toISOString(),
      summary: "Approval recorded. Connector execution remains mocked for this action.",
      status: "skipped",
      recipient: request.session.authUser.email,
    };

    return { actionId: action.id, details: skipped };
  }

  const googleToken = await getGoogleAccessToken(request, [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
  ]);

  const scenario = scenarios.find((entry) => entry.id === run.scenarioId);
  const property = scenario?.property ?? "DealAirLock workflow";
  const subject = `[DealAirLock] ${action.title} for ${property}`;
  const text = [
    "This message was sent by DealAirLock after explicit operator approval.",
    "",
    `Workflow: ${scenario?.name ?? run.scenarioId}`,
    `Property / SPV: ${property}`,
    `Action: ${action.title}`,
    `Risk tier: ${action.risk}`,
    "",
    `Why it was gated: ${action.prysmChecks.join(", ")}`,
    "",
    "This is a governed demo delivery using Auth0 Token Vault and a connected Google account.",
  ].join("\n");

  const result = await sendGmailMessage({
    accessToken: googleToken.access_token,
    to: request.session.authUser.email,
    from: request.session.authUser.email,
    subject,
    text,
  });

  const execution: ActionExecution = {
    connector: "Gmail",
    executedAt: new Date().toISOString(),
    summary: "Sent a governed demo email to the operator inbox using Token Vault.",
    status: "executed",
    recipient: request.session.authUser.email,
    externalId: result.id,
  };

  return { actionId: action.id, details: execution };
}

async function listConnectedAccounts(accessToken: string) {
  const payload = await getJson<{ accounts?: ConnectedAccount[] }>(
    `${auth0Urls.myAccountBaseUrl}/connected-accounts/accounts`,
    accessToken,
  );
  return payload.accounts ?? [];
}

function buildIntegrationStatus(): IntegrationStatus {
  const auth0Missing = [
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_M2M_CLIENT_ID",
    "AUTH0_M2M_CLIENT_SECRET",
  ].filter((key) => !process.env[key as keyof NodeJS.ProcessEnv]);
  const prysmMissing = ["PRYSM_BASE_URL", "PRYSM_API_KEY"].filter(
    (key) => !process.env[key as keyof NodeJS.ProcessEnv],
  );

  return {
    auth0: {
      configured: auth0Missing.length === 0,
      missing: auth0Missing,
    },
    prysm: {
      configured: prysmMissing.length === 0,
      missing: prysmMissing,
    },
  };
}

function buildLoginUrl(req: express.Request) {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.auth0State = state;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.auth0.clientId,
    redirect_uri: auth0Urls.callbackUrl,
    scope: "openid profile email offline_access",
    state,
  });

  return `${auth0Urls.authorizeUrl}?${params.toString()}`;
}

function authStatus(req: express.Request) {
  return {
    isAuthenticated: Boolean(req.session.authUser),
    user: req.session.authUser ?? null,
    loginUrl: "/api/auth/login",
    logoutUrl: "/api/auth/logout",
  };
}

async function tokenVaultStatus(request: express.Request): Promise<TokenVaultStatus> {
  const missing = ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"].filter(
    (key) => !process.env[key as keyof NodeJS.ProcessEnv],
  );

  const base: TokenVaultStatus = {
    state: "needs_login",
    configured: missing.length === 0,
    ready: false,
    myAccountApiReady: false,
    hasRefreshToken: Boolean(request.session.authTokens?.refreshToken),
    googleConnected: false,
    missing,
    connectUrl: "/api/token-vault/connect/google",
    accounts: [],
  };

  const cachedStatus = request.session.tokenVault?.cachedStatus;
  const checkedAt = request.session.tokenVault?.checkedAt ?? 0;
  if (cachedStatus && Date.now() - checkedAt < tokenVaultStatusTtlMs) {
    return cachedStatus;
  }

  if (!request.session.authUser) {
    return base;
  }

  if (!request.session.authTokens?.refreshToken) {
    return {
      ...base,
      state: "needs_refresh_token",
      title: "Reconnect required",
      guidance: "Sign in again so DealAirLock receives the refresh token needed for My Account API token exchange.",
      error: "Auth0 login succeeded, but no refresh token is available yet.",
    };
  }

  try {
    const tokenResponse = await getMyAccountApiToken(request);
    const accounts = await listConnectedAccounts(tokenResponse.access_token);
    const googleConnected = accounts.some((account) => account.connection === "google-oauth2");
    const status: TokenVaultStatus = {
      ...base,
      state: googleConnected ? "connected" : "ready",
      title: googleConnected ? "Google connected" : "Connect Google",
      guidance: googleConnected
        ? "Token Vault can now broker Gmail and Drive access for high-trust workflow actions."
        : "Google is ready to connect. Token Vault can request delegated Gmail and Drive access when you continue.",
      ready: true,
      myAccountApiReady: true,
      accounts,
      googleConnected,
      error: request.session.tokenVault?.lastError,
    };
    request.session.tokenVault = {
      ...(request.session.tokenVault ?? {}),
      cachedStatus: status,
      checkedAt: Date.now(),
    };
    return status;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        const status: TokenVaultStatus = {
          ...base,
          state: "rate_limited",
          title: "Auth0 rate limit hit",
          guidance:
            "Token Vault is reachable, but Auth0 is rate limiting requests right now. Wait a minute, then retry once.",
          myAccountApiReady: true,
          error: error.detail ?? error.message,
        };
        request.session.tokenVault = {
          ...(request.session.tokenVault ?? {}),
          cachedStatus: status,
          checkedAt: Date.now(),
          lastError: error.detail ?? error.message,
        };
        return status;
      }

      if (error.status === 401) {
        const status: TokenVaultStatus = {
          ...base,
          state: "needs_setup",
          title: "My Account API setup incomplete",
          guidance:
            "Token Vault still needs My Account API + MRRT or connection access configured before Google can be connected.",
          error: error.detail ?? error.message,
        };
        request.session.tokenVault = {
          ...(request.session.tokenVault ?? {}),
          cachedStatus: status,
          checkedAt: Date.now(),
          lastError: error.detail ?? error.message,
        };
        return status;
      }
    }

    const status: TokenVaultStatus = {
      ...base,
      state: "error",
      title: "Connected Accounts not ready",
      guidance:
        "DealAirLock reached Auth0, but the Token Vault flow still has a tenant-side error to resolve.",
      error: error instanceof Error ? error.message : "Token Vault is not ready yet.",
    };
    request.session.tokenVault = {
      ...(request.session.tokenVault ?? {}),
      cachedStatus: status,
      checkedAt: Date.now(),
      lastError: error instanceof Error ? error.message : "Token Vault is not ready yet.",
    };
    return status;
  }
}

function getScenarioOrThrow(scenarioId: string): Scenario {
  const scenario = scenarios.find((entry) => entry.id === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
  return scenario;
}

function getActiveRunOrThrow(state: { activeRun: WorkflowRun | null }, sessionId: string) {
  if (!state.activeRun || state.activeRun.sessionId !== sessionId) {
    throw new Error("Active run not found");
  }
  return state.activeRun;
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    app: "DealAirLock",
    integrationStatus: buildIntegrationStatus(),
  });
});

app.get("/api/auth/status", (request, response) => {
  response.json(authStatus(request));
});

app.get("/api/token-vault/status", async (request, response) => {
  response.json(await tokenVaultStatus(request));
});

app.get("/api/auth/login", (request, response) => {
  response.redirect(buildLoginUrl(request));
});

app.get("/api/auth/callback", async (request, response) => {
  const state = String(request.query.state ?? "");
  const code = String(request.query.code ?? "");

  if (!code || !state || state !== request.session.auth0State) {
    response.redirect(`${env.appUrl}?auth=error`);
    return;
  }

  try {
    const tokenResponse = await postJson<{
      access_token?: string;
      id_token?: string;
      refresh_token?: string;
    }>(auth0Urls.tokenUrl, {
      grant_type: "authorization_code",
      client_id: env.auth0.clientId,
      client_secret: env.auth0.clientSecret,
      code,
      redirect_uri: auth0Urls.callbackUrl,
    });

    const user = tokenResponse.access_token
      ? await getJson<{ sub: string; name?: string; email?: string; picture?: string }>(
          auth0Urls.userInfoUrl,
          tokenResponse.access_token,
        )
      : null;

    request.session.authTokens = {
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      refreshToken: tokenResponse.refresh_token,
    };
    request.session.authUser = user ?? undefined;
    request.session.auth0State = undefined;
    request.session.tokenVault = undefined;
    response.redirect(env.appUrl);
  } catch {
    response.redirect(`${env.appUrl}?auth=error`);
  }
});

app.get("/api/auth/logout", (request, response) => {
  request.session.destroy(() => {
    const params = new URLSearchParams({
      client_id: env.auth0.clientId,
      returnTo: auth0Urls.logoutReturnTo,
    });
    response.redirect(`${auth0Urls.logoutUrl}?${params.toString()}`);
  });
});

app.get("/api/token-vault/connect/google", async (request, response) => {
  if (!request.session.authUser) {
    response.redirect("/api/auth/login");
    return;
  }

  try {
    const tokenResponse = await getMyAccountApiToken(request);
    const state = crypto.randomBytes(16).toString("hex");
    const connectResponse = await postJson<{
      auth_session: string;
      connect_uri: string;
      connect_params: { ticket: string };
    }>(`${auth0Urls.myAccountBaseUrl}/connected-accounts/connect`, {
      connection: "google-oauth2",
      redirect_uri: auth0Urls.tokenVaultCallbackUrl,
      state,
      scopes: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.file",
      ],
    }, tokenResponse.access_token);

    request.session.tokenVault = {
      ...(request.session.tokenVault ?? {}),
      googleAuthSession: connectResponse.auth_session,
      googleState: state,
      lastError: undefined,
      cachedStatus: undefined,
      checkedAt: undefined,
    };

    const connectUrl = new URL(connectResponse.connect_uri);
    connectUrl.searchParams.set("ticket", connectResponse.connect_params.ticket);
    response.redirect(connectUrl.toString());
  } catch (error) {
    request.session.tokenVault = {
      ...(request.session.tokenVault ?? {}),
      lastError: error instanceof Error ? error.message : "Unable to start Google connection.",
      cachedStatus: undefined,
      checkedAt: undefined,
    };
    response.redirect(`${env.appUrl}?connect=error`);
  }
});

app.get("/api/token-vault/callback", async (request, response) => {
  const connectCode = String(request.query.connect_code ?? "");
  const state = String(request.query.state ?? "");
  const authSession = request.session.tokenVault?.googleAuthSession;
  const expectedState = request.session.tokenVault?.googleState;

  if (!connectCode || !authSession || !expectedState || expectedState !== state) {
    request.session.tokenVault = {
      ...(request.session.tokenVault ?? {}),
      lastError: "Connected Accounts callback state mismatch.",
    };
    response.redirect(`${env.appUrl}?connect=error`);
    return;
  }

  try {
    const tokenResponse = await getMyAccountApiToken(request);
    const account = await postJson<ConnectedAccount>(
      `${auth0Urls.myAccountBaseUrl}/connected-accounts/complete`,
      {
        auth_session: authSession,
        connect_code: connectCode,
        redirect_uri: auth0Urls.tokenVaultCallbackUrl,
      },
      tokenResponse.access_token,
    );

    request.session.tokenVault = {
      googleAuthSession: undefined,
      googleState: undefined,
      lastConnectedAccountId: account.id,
      lastError: undefined,
      cachedStatus: undefined,
      checkedAt: undefined,
    };
    response.redirect(`${env.appUrl}?connect=google`);
  } catch (error) {
    request.session.tokenVault = {
      ...(request.session.tokenVault ?? {}),
      lastError: error instanceof Error ? error.message : "Unable to complete Google connection.",
      cachedStatus: undefined,
      checkedAt: undefined,
    };
    response.redirect(`${env.appUrl}?connect=error`);
  }
});

app.delete("/api/token-vault/accounts/:accountId", async (request, response) => {
  if (!request.session.authUser) {
    response.status(401).json({ error: "Login required" });
    return;
  }

  try {
    const tokenResponse = await getMyAccountApiToken(request);
    await deleteJson(
      `${auth0Urls.myAccountBaseUrl}/connected-accounts/accounts/${request.params.accountId}`,
      tokenResponse.access_token,
    );
    request.session.tokenVault = {
      ...(request.session.tokenVault ?? {}),
      lastConnectedAccountId: undefined,
      lastError: undefined,
      cachedStatus: undefined,
      checkedAt: undefined,
    };
    response.status(204).end();
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Unable to delete connected account.",
    });
  }
});

app.get("/api/scenarios", (_request, response) => {
  response.json({ scenarios });
});

app.get("/api/integrations/status", (_request, response) => {
  response.json(buildIntegrationStatus());
});

app.get("/api/runs/active", async (_request, response) => {
  const state = await readStore();
  response.json({ run: state.activeRun });
});

app.get("/api/runs/history", async (_request, response) => {
  const state = await readStore();
  response.json({ history: state.history });
});

app.post("/api/runs/start", async (request, response) => {
  try {
    const scenario = getScenarioOrThrow(String(request.body.scenarioId ?? ""));
    const run = createRun(scenario);
    await persistRun(run);
    response.status(201).json({ run });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Unable to start run",
    });
  }
});

app.post("/api/runs/:sessionId/approve", async (request, response) => {
  try {
    const state = await readStore();
    const run = getActiveRunOrThrow(state, request.params.sessionId);
    const execution = await executeApprovedAction(request, run);
    const next = approveCurrentAction(run, execution ?? undefined);
    await persistRun(next);
    response.json({ run: next });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Unable to approve run",
    });
  }
});

app.post("/api/runs/:sessionId/reject", async (request, response) => {
  try {
    const state = await readStore();
    const run = getActiveRunOrThrow(state, request.params.sessionId);
    const next = rejectCurrentAction(run);
    await persistRun(next);
    response.json({ run: next });
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to reject run",
    });
  }
});

app.post("/api/runs/:sessionId/restore", async (request, response) => {
  const state = await readStore();
  const run = state.history.find((entry) => entry.sessionId === request.params.sessionId);

  if (!run) {
    response.status(404).json({ error: "Run not found" });
    return;
  }

  await writeStore({
    ...state,
    activeRun: run,
  });

  response.json({ run });
});

app.delete("/api/runs/active", async (_request, response) => {
  await clearActiveRunInStore();
  response.status(204).end();
});

app.listen(env.port, "127.0.0.1", () => {
  console.log(`[DealAirLock API] http://127.0.0.1:${env.port}`);
});
