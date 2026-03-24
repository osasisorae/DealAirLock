type WorkflowStepsProps = {
  signedIn: boolean;
  googleConnected: boolean;
  hasRun: boolean;
  awaitingApproval: boolean;
};

export function WorkflowSteps({
  signedIn,
  googleConnected,
  hasRun,
  awaitingApproval,
}: WorkflowStepsProps) {
  const steps = [
    {
      label: "Sign in",
      description: "Use Auth0 to identify the investor-ops operator.",
      done: signedIn,
      active: !signedIn,
    },
    {
      label: "Connect Google",
      description: "Broker Gmail and Drive access through Token Vault.",
      done: googleConnected,
      active: signedIn && !googleConnected,
    },
    {
      label: "Run workflow",
      description: "Start a governed investor workflow for an SPV or update cycle.",
      done: hasRun,
      active: signedIn && googleConnected && !hasRun,
    },
    {
      label: "Approve action",
      description: "Pause high-risk external actions for human review.",
      done: hasRun && !awaitingApproval,
      active: awaitingApproval,
    },
  ];

  return (
    <section className="panel steps-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Operator Flow</p>
          <h2>One workflow, four stages</h2>
        </div>
      </div>
      <div className="steps-grid">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={`step-card${step.done ? " done" : ""}${step.active ? " active" : ""}`}
          >
            <span className="step-index">{index + 1}</span>
            <strong>{step.label}</strong>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
