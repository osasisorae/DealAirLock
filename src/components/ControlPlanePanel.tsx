import { useState } from "react";
import { buildEvidenceBundle } from "../lib/evidence";
import { countByStatus } from "../lib/workflow";
import type { IntegrationStatus, Scenario, WorkflowRun } from "../types/workflow";

type ControlPlanePanelProps = {
  scenario: Scenario;
  run: WorkflowRun | null;
  integrationStatus: IntegrationStatus | null;
};

export function ControlPlanePanel({
  scenario,
  run,
  integrationStatus,
}: ControlPlanePanelProps) {
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
        <h3>Integration readiness</h3>
        <p>These are the real server-side keys still missing before live Token Vault and Prysm calls.</p>
        <div className="scope-list">
          <div className="scope-row">
            <span>Auth0</span>
            <span className="scope-state">
              {integrationStatus?.auth0.configured ? "configured" : "stubbed"}
            </span>
          </div>
          {!integrationStatus?.auth0.configured
            ? integrationStatus?.auth0.missing.map((item) => (
                <div key={item} className="scope-row scope-missing">
                  <span>{item}</span>
                  <span className="scope-state scope-warning">missing</span>
                </div>
              ))
            : null}
          <div className="scope-row">
            <span>Prysm</span>
            <span className="scope-state">
              {integrationStatus?.prysm.configured ? "configured" : "stubbed"}
            </span>
          </div>
          {!integrationStatus?.prysm.configured
            ? integrationStatus?.prysm.missing.map((item) => (
                <div key={item} className="scope-row scope-missing">
                  <span>{item}</span>
                  <span className="scope-state scope-warning">missing</span>
                </div>
              ))
            : null}
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
