import { useEffect, useMemo, useState } from "react";
import { ApprovalPanel } from "./components/ApprovalPanel";
import { ControlPlanePanel } from "./components/ControlPlanePanel";
import { IntegrationInspector } from "./components/IntegrationInspector";
import { RunArchive } from "./components/RunArchive";
import { RunTimeline } from "./components/RunTimeline";
import { ScenarioRail } from "./components/ScenarioRail";
import { scenarios } from "./data/scenarios";
import {
  approveRun,
  clearActiveRun,
  loadActiveRun,
  loadIntegrationStatus,
  loadRunHistory,
  rejectRun,
  restoreRun,
  startScenarioRun,
} from "./lib/local-api";
import { getAwaitingAction, isRunTerminal } from "./lib/workflow";
import type { IntegrationStatus, WorkflowRun } from "./types/workflow";

export default function App() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [saving, setSaving] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0],
    [selectedScenarioId],
  );
  const awaitingAction = getAwaitingAction(run);

  useEffect(() => {
    void (async () => {
      const [active, storedHistory, status] = await Promise.all([
        loadActiveRun(),
        loadRunHistory(),
        loadIntegrationStatus(),
      ]);
      if (active) {
        setRun(active);
        setSelectedScenarioId(active.scenarioId);
      }
      setHistory(storedHistory);
      setIntegrationStatus(status);
    })();
  }, []);

  async function refreshHistory() {
    setHistory(await loadRunHistory());
  }

  async function handleStart() {
    setSaving(true);
    try {
      const next = await startScenarioRun(selectedScenario);
      setRun(next);
      await refreshHistory();
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!run) return;
    setSaving(true);
    try {
      const next = await approveRun(run);
      setRun(next);
      await refreshHistory();
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!run) return;
    setSaving(true);
    try {
      const next = await rejectRun(run);
      setRun(next);
      await refreshHistory();
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    await clearActiveRun();
    setRun(null);
    await refreshHistory();
  }

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
          onStart={handleStart}
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
          <RunArchive
            history={history}
            onRestore={async (storedRun) => {
              const restored = await restoreRun(storedRun.sessionId);
              setRun(restored);
              setSelectedScenarioId(restored.scenarioId);
              await refreshHistory();
            }}
          />
        </div>
        <div className="side-column">
          <ApprovalPanel
            scenario={selectedScenario}
            awaitingAction={awaitingAction}
            onApprove={handleApprove}
            onReject={handleReject}
          />
          <ControlPlanePanel
            scenario={selectedScenario}
            run={run}
            integrationStatus={integrationStatus}
          />
          <IntegrationInspector
            scenario={selectedScenario}
            run={run}
            awaitingAction={awaitingAction}
          />
          <section className="panel state-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Run State</p>
                <h2>Local API status</h2>
              </div>
            </div>
            <div className="scope-list">
              <div className="scope-row">
                <span>Persistence</span>
                <span className="scope-state">local storage</span>
              </div>
              <div className="scope-row">
                <span>Save state</span>
                <span className="scope-state">{saving ? "saving" : "idle"}</span>
              </div>
              <div className="scope-row">
                <span>Run terminal</span>
                <span className="scope-state">
                  {run && isRunTerminal(run) ? "yes" : "no"}
                </span>
              </div>
            </div>
            <button className="secondary-button small-button" onClick={handleReset} type="button">
              Clear active run
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
