import cors from "cors";
import express from "express";
import { scenarios } from "../src/data/scenarios";
import type { IntegrationStatus, Scenario, WorkflowRun } from "../src/types/workflow";
import { approveCurrentAction, createRun, rejectCurrentAction } from "../src/lib/workflow";
import { clearActiveRunInStore, persistRun, readStore, writeStore } from "./store";

const port = Number(process.env.PORT ?? 8787);
const app = express();

app.use(cors());
app.use(express.json());

function buildIntegrationStatus(): IntegrationStatus {
  const auth0Missing = [
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID",
    "AUTH0_AUDIENCE",
    "AUTH0_TOKEN_VAULT_URL",
    "AUTH0_M2M_CLIENT_ID",
    "AUTH0_M2M_CLIENT_SECRET",
  ].filter((key) => !process.env[key]);
  const prysmMissing = ["PRYSM_BASE_URL", "PRYSM_API_KEY"].filter((key) => !process.env[key]);

  return {
    auth0: {
      configured: auth0Missing.length === 0,
      missing: auth0Missing,
    },
    prysm: {
      configured: prysmMissing.length === 0,
      missing: prysmMissing,
    },
  };
}

function getScenarioOrThrow(scenarioId: string): Scenario {
  const scenario = scenarios.find((entry) => entry.id === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
  return scenario;
}

function getActiveRunOrThrow(state: { activeRun: WorkflowRun | null }, sessionId: string) {
  if (!state.activeRun || state.activeRun.sessionId !== sessionId) {
    throw new Error("Active run not found");
  }
  return state.activeRun;
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    app: "DealAirLock",
    integrationStatus: buildIntegrationStatus(),
  });
});

app.get("/api/scenarios", (_request, response) => {
  response.json({ scenarios });
});

app.get("/api/integrations/status", (_request, response) => {
  response.json(buildIntegrationStatus());
});

app.get("/api/runs/active", async (_request, response) => {
  const state = await readStore();
  response.json({ run: state.activeRun });
});

app.get("/api/runs/history", async (_request, response) => {
  const state = await readStore();
  response.json({ history: state.history });
});

app.post("/api/runs/start", async (request, response) => {
  try {
    const scenario = getScenarioOrThrow(String(request.body.scenarioId ?? ""));
    const run = createRun(scenario);
    await persistRun(run);
    response.status(201).json({ run });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Unable to start run",
    });
  }
});

app.post("/api/runs/:sessionId/approve", async (request, response) => {
  try {
    const state = await readStore();
    const run = getActiveRunOrThrow(state, request.params.sessionId);
    const next = approveCurrentAction(run);
    await persistRun(next);
    response.json({ run: next });
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to approve run",
    });
  }
});

app.post("/api/runs/:sessionId/reject", async (request, response) => {
  try {
    const state = await readStore();
    const run = getActiveRunOrThrow(state, request.params.sessionId);
    const next = rejectCurrentAction(run);
    await persistRun(next);
    response.json({ run: next });
  } catch (error) {
    response.status(404).json({
      error: error instanceof Error ? error.message : "Unable to reject run",
    });
  }
});

app.post("/api/runs/:sessionId/restore", async (request, response) => {
  const state = await readStore();
  const run = state.history.find((entry) => entry.sessionId === request.params.sessionId);

  if (!run) {
    response.status(404).json({ error: "Run not found" });
    return;
  }

  await writeStore({
    ...state,
    activeRun: run,
  });

  response.json({ run });
});

app.delete("/api/runs/active", async (_request, response) => {
  await clearActiveRunInStore();
  response.status(204).end();
});

app.listen(port, "127.0.0.1", () => {
  console.log(`[DealAirLock API] http://127.0.0.1:${port}`);
});
