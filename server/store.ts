import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowRun } from "../src/types/workflow";

type StoreState = {
  activeRun: WorkflowRun | null;
  history: WorkflowRun[];
};

const dataDir = path.join(process.cwd(), "server", "data");
const stateFile = path.join(dataDir, "runs.json");

const emptyState: StoreState = {
  activeRun: null,
  history: [],
};

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
}

export async function readStore(): Promise<StoreState> {
  await ensureStore();

  try {
    const raw = await readFile(stateFile, "utf8");
    return JSON.parse(raw) as StoreState;
  } catch {
    return emptyState;
  }
}

export async function writeStore(state: StoreState) {
  await ensureStore();
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
}

export async function persistRun(run: WorkflowRun) {
  const state = await readStore();
  const next: StoreState = {
    activeRun: run,
    history: [run, ...state.history.filter((entry) => entry.sessionId !== run.sessionId)].slice(0, 8),
  };
  await writeStore(next);
  return next;
}

export async function clearActiveRunInStore() {
  const state = await readStore();
  const next = { ...state, activeRun: null };
  await writeStore(next);
  return next;
}
