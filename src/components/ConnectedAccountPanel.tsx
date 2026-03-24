import type { TokenVaultStatus } from "../types/token-vault";

type ConnectedAccountPanelProps = {
  status: TokenVaultStatus | null;
};

export function ConnectedAccountPanel({ status }: ConnectedAccountPanelProps) {
  const google = status?.accounts.find((account) => account.connection === "google-oauth2");
  const canConnect = status?.state !== "rate_limited";

  return (
    <section className="panel auth-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Connected Accounts</p>
          <h2>{status?.title ?? (google ? "Google connected" : "Connect Google")}</h2>
        </div>
      </div>
      {google ? (
        <>
          <p className="approval-copy">
            Token Vault can now broker delegated Google access for the operator account.
          </p>
          <div className="evidence-list">
            {google.scopes.map((scope) => (
              <span key={scope} className="ghost-pill">
                {scope}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="approval-copy">
            {status?.guidance ??
              "Connect Google so the agent can request Gmail and Drive access through Token Vault instead of storing provider tokens itself."}
          </p>
          {status?.error ? (
            <details className="technical-note">
              <summary>Technical error</summary>
              <pre className="inline-code-block">{status.error}</pre>
            </details>
          ) : null}
          {status && !status.ready && status.state !== "rate_limited" ? (
            <div className="scope-list">
              {!status.hasRefreshToken ? (
                <div className="scope-row scope-missing">
                  <span>Refresh token from login</span>
                  <span className="scope-state scope-warning">missing</span>
                </div>
              ) : null}
              {!status.myAccountApiReady ? (
                <div className="scope-row scope-missing">
                  <span>My Account API / MRRT</span>
                  <span className="scope-state scope-warning">needs setup</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
      <div className="approval-actions">
        <a
          className={`primary-button auth-link${!canConnect ? " disabled-link" : ""}`}
          href={canConnect ? status?.connectUrl ?? "/api/token-vault/connect/google" : undefined}
          onClick={(event) => {
            if (!canConnect) event.preventDefault();
          }}
        >
          {google ? "Reconnect Google" : "Connect Google"}
        </a>
      </div>
    </section>
  );
}
