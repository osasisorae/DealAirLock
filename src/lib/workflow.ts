import type { RunAction, Scenario, WorkflowRun } from "../types/workflow";

function buildQueuedActions(actions: Scenario["actions"]): RunAction[] {
  const next: RunAction[] = [];
  let waiting = false;

  for (const action of actions) {
    if (waiting) {
      next.push({ ...action, status: "queued" });
      continue;
    }

    if (action.requiresApproval) {
      next.push({ ...action, status: "awaiting_approval" });
      waiting = true;
      continue;
    }

    next.push({ ...action, status: "completed" });
  }

  return next;
}

function advanceUntilGate(actions: RunAction[]): RunAction[] {
  const next = [...actions];
  let gateFound = false;

  for (let index = 0; index < next.length; index += 1) {
    const action = next[index];
    if (action.status !== "queued") {
      if (action.status === "awaiting_approval") {
        gateFound = true;
      }
      continue;
    }

    if (gateFound) {
      continue;
    }

    if (action.requiresApproval) {
      next[index] = { ...action, status: "awaiting_approval" };
      gateFound = true;
    } else {
      next[index] = { ...action, status: "completed" };
    }
  }

  return next;
}

export function createRun(scenario: Scenario): WorkflowRun {
  return {
    id: `run_${scenario.id}`,
    sessionId: `sess_${scenario.id}_${Date.now().toString(36)}`,
    scenarioId: scenario.id,
    startedAt: new Date().toISOString(),
    agent: scenario.agent,
    policyPack: scenario.policyPack,
    auth0Scopes: scenario.auth0Scopes,
    connectors: scenario.connectors,
    actions: buildQueuedActions(scenario.actions),
  };
}

export function approveCurrentAction(run: WorkflowRun): WorkflowRun {
  const nextActions = run.actions.map((action) =>
    action.status === "awaiting_approval"
      ? { ...action, status: "completed" as const, decision: "approved" as const }
      : action,
  );

  return {
    ...run,
    actions: advanceUntilGate(nextActions),
  };
}

export function rejectCurrentAction(run: WorkflowRun): WorkflowRun {
  let rejecting = true;
  const nextActions = run.actions.map((action) => {
    if (action.status === "awaiting_approval") {
      rejecting = false;
      return { ...action, status: "blocked" as const, decision: "rejected" as const };
    }

    if (rejecting || action.status !== "queued") {
      return action;
    }

    return {
      ...action,
      status: "blocked" as const,
    };
  });

  return {
    ...run,
    actions: nextActions,
  };
}

export function getAwaitingAction(run: WorkflowRun | null) {
  return run?.actions.find((action) => action.status === "awaiting_approval") ?? null;
}

export function countByStatus(run: WorkflowRun | null) {
  if (!run) {
    return {
      completed: 0,
      awaiting: 0,
      blocked: 0,
      queued: 0,
    };
  }

  return run.actions.reduce(
    (accumulator, action) => {
      if (action.status === "completed") accumulator.completed += 1;
      if (action.status === "awaiting_approval") accumulator.awaiting += 1;
      if (action.status === "blocked") accumulator.blocked += 1;
      if (action.status === "queued") accumulator.queued += 1;
      return accumulator;
    },
    {
      completed: 0,
      awaiting: 0,
      blocked: 0,
      queued: 0,
    },
  );
}
