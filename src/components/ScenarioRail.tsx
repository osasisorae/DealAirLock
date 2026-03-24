import type { Scenario } from "../types/workflow";

type ScenarioRailProps = {
  scenarios: Scenario[];
  selectedScenarioId: string;
  onSelect: (scenarioId: string) => void;
  onStart: () => void;
};

export function ScenarioRail({
  scenarios,
  selectedScenarioId,
  onSelect,
  onStart,
}: ScenarioRailProps) {
  return (
    <aside className="panel scenario-rail">
      <div className="panel-header">
        <p className="eyebrow">Hack Flow</p>
        <h2>Pick an investor workflow</h2>
      </div>
      <div className="scenario-list">
        {scenarios.map((scenario) => {
          const active = scenario.id === selectedScenarioId;
          return (
            <button
              key={scenario.id}
              className={`scenario-card${active ? " active" : ""}`}
              onClick={() => onSelect(scenario.id)}
              type="button"
            >
              <span className="scenario-persona">{scenario.persona}</span>
              <strong>{scenario.name}</strong>
              <p>{scenario.pitch}</p>
              <span className="scenario-property">{scenario.property}</span>
            </button>
          );
        })}
      </div>
      <button className="primary-button" onClick={onStart} type="button">
        Start governed run
      </button>
    </aside>
  );
}
