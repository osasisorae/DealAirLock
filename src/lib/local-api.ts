import type { AuthStatus } from "../types/auth";
import type { TokenVaultStatus } from "../types/token-vault";
import type { IntegrationStatus, Scenario, WorkflowRun } from "../types/workflow";

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const message = await response.text();
    let parsedMessage: string | null = null;
    try {
      const parsed = JSON.parse(message) as { error?: string; message?: string };
      parsedMessage = parsed.error ?? parsed.message ?? null;
    } catch {
      // Keep raw text fallback below.
    }
    throw new Error(parsedMessage ?? message ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loadActiveRun() {
  const payload = await readJson<{ run: WorkflowRun | null }>("/api/runs/active");
  return payload.run;
}

export async function loadRunHistory() {
  const payload = await readJson<{ history: WorkflowRun[] }>("/api/runs/history");
  return payload.history;
}

export async function loadIntegrationStatus() {
  return readJson<IntegrationStatus>("/api/integrations/status");
}

export async function loadAuthStatus() {
  return readJson<AuthStatus>("/api/auth/status");
}

export async function loadTokenVaultStatus() {
  return readJson<TokenVaultStatus>("/api/token-vault/status");
}

export async function startScenarioRun(scenario: Scenario) {
  const payload = await readJson<{ run: WorkflowRun }>("/api/runs/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scenarioId: scenario.id,
    }),
  });
  return payload.run;
}

export async function approveRun(run: WorkflowRun) {
  const payload = await readJson<{ run: WorkflowRun }>(
    `/api/runs/${run.sessionId}/approve`,
    { method: "POST" },
  );
  return payload.run;
}

export async function rejectRun(run: WorkflowRun) {
  const payload = await readJson<{ run: WorkflowRun }>(
    `/api/runs/${run.sessionId}/reject`,
    { method: "POST" },
  );
  return payload.run;
}

export async function restoreRun(sessionId: string) {
  const payload = await readJson<{ run: WorkflowRun }>(`/api/runs/${sessionId}/restore`, {
    method: "POST",
  });
  return payload.run;
}

export async function clearActiveRun() {
  await readJson<void>("/api/runs/active", { method: "DELETE" });
}
