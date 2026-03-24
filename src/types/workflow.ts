export type RiskLevel = "low" | "medium" | "high";
export type ActionStatus =
  | "completed"
  | "awaiting_approval"
  | "blocked"
  | "queued";

export type WorkflowAction = {
  id: string;
  title: string;
  description: string;
  connector: string;
  auth0Scopes: string[];
  prysmChecks: string[];
  evidence: string[];
  risk: RiskLevel;
  requiresApproval?: boolean;
  requiresStepUp?: boolean;
};

export type Scenario = {
  id: string;
  name: string;
  pitch: string;
  persona: string;
  property: string;
  goal: string;
  agent: string;
  policyPack: string;
  auth0Scopes: string[];
  connectors: string[];
  actions: WorkflowAction[];
};

export type RunAction = WorkflowAction & {
  status: ActionStatus;
  decision?: "approved" | "rejected";
};

export type WorkflowRun = {
  id: string;
  sessionId: string;
  scenarioId: string;
  startedAt: string;
  agent: string;
  policyPack: string;
  auth0Scopes: string[];
  connectors: string[];
  actions: RunAction[];
};
