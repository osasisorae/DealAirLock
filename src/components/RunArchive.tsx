import type { WorkflowRun } from "../types/workflow";

type RunArchiveProps = {
  history: WorkflowRun[];
  onRestore: (run: WorkflowRun) => void | Promise<void>;
};

export function RunArchive({ history, onRestore }: RunArchiveProps) {
  return (
    <section className="panel archive-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Saved Runs</p>
          <h2>Local evidence history</h2>
        </div>
      </div>
      {history.length === 0 ? (
        <p className="archive-empty">No saved runs yet.</p>
      ) : (
        <div className="archive-list">
          {history.map((run) => (
            <button
              key={run.sessionId}
              className="archive-item"
              onClick={() => onRestore(run)}
              type="button"
            >
              <strong>{run.agent}</strong>
              <span>{run.sessionId}</span>
              <span>{new Date(run.updatedAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
