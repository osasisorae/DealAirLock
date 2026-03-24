import type { Scenario, WorkflowRun } from "../types/workflow";

export function buildEvidenceBundle(scenario: Scenario, run: WorkflowRun | null) {
  if (!run) {
    return {
      app: "DealAirLock",
      status: "idle",
      note: "No governed run has started yet.",
    };
  }

  return {
    app: "DealAirLock",
    workflow: scenario.name,
    property: scenario.property,
    goal: scenario.goal,
    sessionId: run.sessionId,
    startedAt: run.startedAt,
    agent: run.agent,
    policyPack: run.policyPack,
    auth0: {
      connectors: run.connectors,
      scopes: run.auth0Scopes,
    },
    prysm: {
      traceState: "active",
      evidenceExportable: true,
      decisions: run.actions
        .filter((action) => action.decision)
        .map((action) => ({
          actionId: action.id,
          title: action.title,
          decision: action.decision,
          risk: action.risk,
        })),
    },
    actions: run.actions.map((action) => ({
      id: action.id,
      title: action.title,
      connector: action.connector,
      risk: action.risk,
      status: action.status,
      auth0Scopes: action.auth0Scopes,
      prysmChecks: action.prysmChecks,
      evidence: action.evidence,
      decision: action.decision ?? null,
      execution: action.execution ?? null,
    })),
  };
}
