import type { Scenario, WorkflowRun } from "../types/workflow";
import { approveCurrentAction, createRun, isRunTerminal, rejectCurrentAction } from "./workflow";

const ACTIVE_RUN_KEY = "dealairlock.activeRun";
const RUN_HISTORY_KEY = "dealairlock.runHistory";

function readJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function writeHistory(run: WorkflowRun) {
  const history = readJson<WorkflowRun[]>(RUN_HISTORY_KEY, []);
  const next = [run, ...history.filter((entry) => entry.sessionId !== run.sessionId)].slice(0, 8);
  writeJson(RUN_HISTORY_KEY, next);
}

function persistRun(run: WorkflowRun) {
  writeJson(ACTIVE_RUN_KEY, run);
  writeHistory(run);
}

export async function loadActiveRun() {
  return readJson<WorkflowRun | null>(ACTIVE_RUN_KEY, null);
}

export async function loadRunHistory() {
  return readJson<WorkflowRun[]>(RUN_HISTORY_KEY, []);
}

export async function startScenarioRun(scenario: Scenario) {
  const run = createRun(scenario);
  persistRun(run);
  return run;
}

export async function approveRun(run: WorkflowRun) {
  const next = approveCurrentAction(run);
  persistRun(next);
  return next;
}

export async function rejectRun(run: WorkflowRun) {
  const next = rejectCurrentAction(run);
  persistRun(next);
  return next;
}

export async function clearActiveRun() {
  window.localStorage.removeItem(ACTIVE_RUN_KEY);
}

export async function shouldArchiveBanner(run: WorkflowRun | null) {
  return Boolean(run && isRunTerminal(run));
}
