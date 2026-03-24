import type { WorkflowRun } from "../types/workflow";

const statusLabel: Record<string, string> = {
  completed: "Completed",
  awaiting_approval: "Awaiting approval",
  blocked: "Blocked",
  queued: "Queued",
};

export function RunTimeline({ run }: { run: WorkflowRun | null }) {
  if (!run) {
    return (
      <section className="panel timeline-panel empty-state">
        <p className="eyebrow">Prysm Session</p>
        <h2>No workflow running yet</h2>
        <p>
          Start a run to see how Auth0 permissions, Prysm checks, approvals, and evidence
          connect in one operator flow.
        </p>
      </section>
    );
  }

  return (
    <section className="panel timeline-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Prysm Session</p>
          <h2>{run.agent}</h2>
        </div>
        <div className="session-meta">
          <span>{run.sessionId}</span>
          <span>{new Date(run.startedAt).toLocaleTimeString()}</span>
        </div>
      </div>
      <ol className="timeline">
        {run.actions.map((action, index) => (
          <li key={action.id} className={`timeline-item status-${action.status}`}>
            <div className="timeline-index">{index + 1}</div>
            <div className="timeline-body">
              <div className="timeline-title-row">
                <div>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
                <div className="status-stack">
                  <span className={`pill risk-${action.risk}`}>{action.risk} risk</span>
                  <span className={`pill status-${action.status}`}>
                    {statusLabel[action.status]}
                  </span>
                </div>
              </div>
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Connector</span>
                  <span>{action.connector}</span>
                </div>
                <div>
                  <span className="detail-label">Auth0 scopes</span>
                  <span>{action.auth0Scopes.length > 0 ? action.auth0Scopes.join(", ") : "None"}</span>
                </div>
                <div>
                  <span className="detail-label">Prysm checks</span>
                  <span>{action.prysmChecks.join(", ")}</span>
                </div>
              </div>
              <div className="evidence-list">
                {action.evidence.map((item) => (
                  <span key={item} className="ghost-pill">
                    {item}
                  </span>
                ))}
                {action.requiresStepUp ? (
                  <span className="ghost-pill warning-pill">step-up</span>
                ) : null}
                {action.decision ? (
                  <span className="ghost-pill decision-pill">Decision: {action.decision}</span>
                ) : null}
              </div>
              {action.execution ? (
                <div className="detail-grid execution-grid">
                  <div>
                    <span className="detail-label">Execution</span>
                    <span>{action.execution.summary}</span>
                  </div>
                  <div>
                    <span className="detail-label">Executed at</span>
                    <span>{new Date(action.execution.executedAt).toLocaleString()}</span>
                  </div>
                  {action.execution.recipient ? (
                    <div>
                      <span className="detail-label">Recipient</span>
                      <span>{action.execution.recipient}</span>
                    </div>
                  ) : null}
                  {action.execution.externalId ? (
                    <div>
                      <span className="detail-label">Provider ID</span>
                      <span>{action.execution.externalId}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
