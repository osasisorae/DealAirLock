import {
  buildAuth0TokenVaultPayload,
  buildPrysmDecisionPayload,
  buildPrysmSessionPayload,
} from "../lib/integration-payloads";
import type { RunAction, Scenario, WorkflowRun } from "../types/workflow";

type IntegrationInspectorProps = {
  scenario: Scenario;
  run: WorkflowRun | null;
  awaitingAction: RunAction | null;
};

export function IntegrationInspector({
  scenario,
  run,
  awaitingAction,
}: IntegrationInspectorProps) {
  const tokenVaultPayload = buildAuth0TokenVaultPayload(scenario, awaitingAction);
  const prysmSessionPayload = buildPrysmSessionPayload(scenario, run);
  const prysmDecisionPayload = buildPrysmDecisionPayload(run, awaitingAction);

  return (
    <section className="panel integration-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Integration Payloads</p>
          <h2>What the real app would send</h2>
        </div>
      </div>
      <div className="payload-stack">
        <div className="stack-card">
          <h3>Auth0 Token Vault request</h3>
          <p>Delegated scope request for the current workflow or gated action.</p>
          <pre className="code-block">{JSON.stringify(tokenVaultPayload, null, 2)}</pre>
        </div>
        <div className="stack-card">
          <h3>Prysm session start</h3>
          <p>Governance session metadata for the full investor workflow.</p>
          <pre className="code-block">{JSON.stringify(prysmSessionPayload, null, 2)}</pre>
        </div>
        <div className="stack-card">
          <h3>Prysm decision gate</h3>
          <p>The exact approval/step-up checkpoint the operator is being asked to review.</p>
          <pre className="code-block">{JSON.stringify(prysmDecisionPayload, null, 2)}</pre>
        </div>
      </div>
    </section>
  );
}
