import type { AuthStatus } from "../types/auth";

type AuthPanelProps = {
  auth: AuthStatus | null;
};

export function AuthPanel({ auth }: AuthPanelProps) {
  return (
    <section className="panel auth-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Operator Access</p>
          <h2>{auth?.isAuthenticated ? "Signed in" : "Auth0 login required"}</h2>
        </div>
      </div>
      {auth?.isAuthenticated && auth.user ? (
        <div className="auth-user">
          {auth.user.picture ? (
            <img alt={auth.user.name ?? auth.user.email ?? "Operator"} src={auth.user.picture} />
          ) : null}
          <div>
            <strong>{auth.user.name ?? "Operator"}</strong>
            <p>{auth.user.email ?? auth.user.sub}</p>
          </div>
        </div>
      ) : (
        <p className="approval-copy">
          Sign in through Auth0 before connecting Google and requesting Token Vault access on
          behalf of an investor-ops operator.
        </p>
      )}
      <div className="approval-actions">
        <a className="primary-button auth-link" href={auth?.loginUrl ?? "/api/auth/login"}>
          {auth?.isAuthenticated ? "Switch account" : "Log in with Auth0"}
        </a>
        {auth?.isAuthenticated ? (
          <a className="secondary-button auth-link" href={auth.logoutUrl}>
            Log out
          </a>
        ) : null}
      </div>
    </section>
  );
}
