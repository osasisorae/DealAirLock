import { useMemo, useState } from "react";
import { ApprovalPanel } from "./components/ApprovalPanel";
import { ControlPlanePanel } from "./components/ControlPlanePanel";
import { IntegrationInspector } from "./components/IntegrationInspector";
import { RunTimeline } from "./components/RunTimeline";
import { ScenarioRail } from "./components/ScenarioRail";
import { scenarios } from "./data/scenarios";
import { approveCurrentAction, createRun, getAwaitingAction, rejectCurrentAction } from "./lib/workflow";
import type { WorkflowRun } from "./types/workflow";

export default function App() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);
  const [run, setRun] = useState<WorkflowRun | null>(null);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0],
    [selectedScenarioId],
  );
  const awaitingAction = getAwaitingAction(run);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">DealAirLock</p>
          <h1>Governed AI for investor operations</h1>
          <p className="hero-copy">
            Give an AI agent limited access to investor workflows, then hold sensitive actions
            behind clear approval boundaries. Auth0 provides delegated access. Prysm provides
            runtime control, policy, and evidence.
          </p>
        </div>
        <div className="hero-callout">
          <span className="ghost-pill">Token Vault</span>
          <span className="ghost-pill">Step-up auth</span>
          <span className="ghost-pill">Prysm governance</span>
          <span className="ghost-pill">Evidence export</span>
        </div>
      </header>

      <main className="layout">
        <ScenarioRail
          scenarios={scenarios}
          selectedScenarioId={selectedScenario.id}
          onSelect={setSelectedScenarioId}
          onStart={() => setRun(createRun(selectedScenario))}
        />
        <div className="main-column">
          <section className="panel scenario-summary">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Selected workflow</p>
                <h2>{selectedScenario.name}</h2>
              </div>
            </div>
            <div className="summary-grid">
              <div className="stat-card">
                <span className="detail-label">Goal</span>
                <strong>{selectedScenario.goal}</strong>
              </div>
              <div className="stat-card">
                <span className="detail-label">Property / SPV</span>
                <strong>{selectedScenario.property}</strong>
              </div>
            </div>
          </section>
          <RunTimeline run={run} />
        </div>
        <div className="side-column">
          <ApprovalPanel
            scenario={selectedScenario}
            awaitingAction={awaitingAction}
            onApprove={() => run && setRun(approveCurrentAction(run))}
            onReject={() => run && setRun(rejectCurrentAction(run))}
          />
          <ControlPlanePanel scenario={selectedScenario} run={run} />
          <IntegrationInspector
            scenario={selectedScenario}
            run={run}
            awaitingAction={awaitingAction}
          />
        </div>
      </main>
    </div>
  );
}
