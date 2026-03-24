import type { RunAction, Scenario } from "../types/workflow";

type ApprovalPanelProps = {
  scenario: Scenario;
  awaitingAction: RunAction | null;
  onApprove: () => void;
  onReject: () => void;
};

export function ApprovalPanel({
  scenario,
  awaitingAction,
  onApprove,
  onReject,
}: ApprovalPanelProps) {
  return (
    <section className="panel approval-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Human In The Loop</p>
          <h2>Approval boundary</h2>
        </div>
      </div>
      {awaitingAction ? (
        <>
          <p className="approval-copy">
            The agent is ready to execute a high-risk action for{" "}
            <strong>{scenario.property}</strong>. Token Vault can supply access, but Prysm is
            holding the action behind approval.
          </p>
          <div className="approval-card">
            <h3>{awaitingAction.title}</h3>
            <p>{awaitingAction.description}</p>
            <div className="evidence-list">
              {awaitingAction.auth0Scopes.map((scope) => (
                <span key={scope} className="ghost-pill">
                  {scope}
                </span>
              ))}
            </div>
          </div>
          <div className="approval-actions">
            <button className="secondary-button" onClick={onReject} type="button">
              Reject action
            </button>
            <button className="primary-button" onClick={onApprove} type="button">
              Approve and continue
            </button>
          </div>
        </>
      ) : (
        <div className="empty-approval">
          <p>Nothing is waiting on approval right now.</p>
          <span className="ghost-pill">Next high-risk action will pause here</span>
        </div>
      )}
    </section>
  );
}
