import { useState } from "react";
import { buildEvidenceBundle } from "../lib/evidence";
import { countByStatus } from "../lib/workflow";
import type { Scenario, WorkflowRun } from "../types/workflow";

type ControlPlanePanelProps = {
  scenario: Scenario;
  run: WorkflowRun | null;
};

export function ControlPlanePanel({ scenario, run }: ControlPlanePanelProps) {
  const [copied, setCopied] = useState(false);
  const counts = countByStatus(run);
  const evidenceBundle = buildEvidenceBundle(scenario, run);

  async function handleCopy() {
    await navigator.clipboard.writeText(JSON.stringify(evidenceBundle, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="panel control-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Control Plane</p>
          <h2>Auth0 + Prysm view</h2>
        </div>
      </div>
      <div className="summary-grid">
        <div className="stat-card">
          <span className="detail-label">Completed steps</span>
          <strong>{counts.completed}</strong>
        </div>
        <div className="stat-card">
          <span className="detail-label">Approval gates</span>
          <strong>{counts.awaiting}</strong>
        </div>
        <div className="stat-card">
          <span className="detail-label">Blocked steps</span>
          <strong>{counts.blocked}</strong>
        </div>
      </div>
      <div className="stack-card">
        <h3>Auth0 boundary</h3>
        <p>Token Vault connectors and delegated scopes visible to the operator.</p>
        <div className="evidence-list">
          {scenario.connectors.map((connector) => (
            <span key={connector} className="ghost-pill">
              {connector}
            </span>
          ))}
        </div>
        <div className="scope-list">
          {scenario.auth0Scopes.map((scope) => (
            <div key={scope} className="scope-row">
              <span>{scope}</span>
              <span className="scope-state">delegated</span>
            </div>
          ))}
        </div>
      </div>
      <div className="stack-card">
        <h3>Prysm governance session</h3>
        <p>{scenario.policyPack}</p>
        <div className="scope-list">
          <div className="scope-row">
            <span>Tracing</span>
            <span className="scope-state">active</span>
          </div>
          <div className="scope-row">
            <span>Policy provenance</span>
            <span className="scope-state">attached</span>
          </div>
          <div className="scope-row">
            <span>Evidence bundle</span>
            <span className="scope-state">{run ? "exportable" : "pending"}</span>
          </div>
          <div className="scope-row">
            <span>Human oversight</span>
            <span className="scope-state">
              {counts.awaiting > 0 ? "waiting" : "clear"}
            </span>
          </div>
        </div>
      </div>
      <div className="stack-card">
        <div className="inline-header">
          <h3>Evidence bundle</h3>
          <button className="secondary-button small-button" onClick={handleCopy} type="button">
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <p>What the operator can export after the run is reviewed.</p>
        <pre className="code-block">
          {JSON.stringify(evidenceBundle, null, 2)}
        </pre>
      </div>
    </section>
  );
}
