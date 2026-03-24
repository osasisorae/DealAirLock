import type { RunAction, Scenario, WorkflowRun } from "../types/workflow";

function serializeAction(action: RunAction) {
  return {
    id: action.id,
    title: action.title,
    connector: action.connector,
    risk: action.risk,
    auth0_scopes: action.auth0Scopes,
    prysm_checks: action.prysmChecks,
    evidence_targets: action.evidence,
    requires_approval: Boolean(action.requiresApproval),
    requires_step_up: Boolean(action.requiresStepUp),
    status: action.status,
    decision: action.decision ?? null,
  };
}

export function buildAuth0TokenVaultPayload(scenario: Scenario, action: RunAction | null) {
  return {
    subject: "investor-ops-agent",
    workflow: scenario.id,
    connectors: scenario.connectors,
    requested_scopes: action ? action.auth0Scopes : scenario.auth0Scopes,
    approval_mode: action?.requiresApproval ? "approval_required" : "inline",
    step_up_required: Boolean(action?.requiresStepUp),
    action: action ? serializeAction(action) : null,
  };
}

export function buildPrysmSessionPayload(scenario: Scenario, run: WorkflowRun | null) {
  return {
    session_type: "deal_airlock_workflow",
    session_id: run?.sessionId ?? "pending",
    workflow: scenario.id,
    policy_pack: scenario.policyPack,
    property: scenario.property,
    metadata: {
      persona: scenario.persona,
      goal: scenario.goal,
      connectors: scenario.connectors,
      auth0_scopes: scenario.auth0Scopes,
    },
  };
}

export function buildPrysmDecisionPayload(run: WorkflowRun | null, action: RunAction | null) {
  return {
    session_id: run?.sessionId ?? "pending",
    decision_type: action?.requiresApproval ? "external_action_gate" : "inline_action",
    action: action ? serializeAction(action) : null,
    operator_required: Boolean(action?.requiresApproval),
    step_up_required: Boolean(action?.requiresStepUp),
    evidence_bundle_ready: Boolean(run),
  };
}
