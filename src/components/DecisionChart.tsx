import { useMemo, useState, type MouseEvent } from "react";
import { CHART, geometryOf } from "../data/chartGeometry";
import type { ChartEvent, DecisionChart as Chart } from "../data/decisionChart";
import { useElementWidth } from "../hooks/useElementWidth";
import { CHART_LABELS as labels } from "./chartLabels";
import { DecisionAxis } from "./DecisionAxis";
import { DecisionChosen } from "./DecisionChosen";
import { DecisionHighlight } from "./DecisionHighlight";
import { DecisionLegend } from "./DecisionLegend";
import { DecisionPlot } from "./DecisionPlot";
import { Switch } from "./Switch";

const valueLabelOf = (chart: Chart, event: ChartEvent) => {
  if (event.kind === "work") return null;
  if (event.kind === "massed") return labels.massed;
  if (event.value === null) return labels.unseen;
  return labels.of(chart).value(event.value);
};

/** Every answer of a student or a session in time order, with what each candidate measured when a review pick ran. */
export const DecisionChart = ({
  chart,
  activeTrial,
  onSelect,
}: {
  chart: Chart;
  activeTrial: number | null;
  onSelect: (event: ChartEvent) => void;
}) => {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [colorHeld, setColorHeld] = useState(true);
  const [markNeverChosen, setMarkNeverChosen] = useState(false);
  const geometry = useMemo(() => geometryOf(chart, width), [chart, width]);
  const trialOf = (event: MouseEvent<SVGSVGElement>) =>
    geometry.trialAt(
      event.clientX - event.currentTarget.getBoundingClientRect().left,
    );
  const column = (trial: number, className: string) => (
    <rect
      className={className}
      x={geometry.x(trial) - geometry.spacing / 2}
      y={CHART.top - 6}
      width={geometry.spacing}
      height={CHART.resultRow + 18 - CHART.top}
    />
  );
  const hoveredEvent = hovered === null ? null : chart.events[hovered - 1];
  const text = labels.of(chart);
  return (
    <section className="card">
      <h3>{text.title}</h3>
      <div className="chart-switches">
        <Switch
          label={text.showCandidates}
          on={showCandidates}
          onChange={setShowCandidates}
        />
        <Switch label={text.colorHeld} on={colorHeld} onChange={setColorHeld} />
        <Switch
          label={text.markNeverChosen}
          on={markNeverChosen}
          onChange={setMarkNeverChosen}
        />
      </div>
      <div className="chart">
        <DecisionAxis chart={chart} geometry={geometry} />
        <div className="chart-scroll" ref={ref}>
          {width > 0 && (
            <div className="chart-canvas" style={{ width: geometry.width }}>
              <svg
                width={geometry.width}
                height={CHART.height}
                onMouseMove={(event) => setHovered(trialOf(event))}
                onMouseLeave={() => setHovered(null)}
                onClick={(event) => onSelect(chart.events[trialOf(event) - 1])}
              >
                {activeTrial !== null && column(activeTrial, "chart-active")}
                {hovered !== null && column(hovered, "chart-hover")}
                <DecisionPlot
                  chart={chart}
                  geometry={geometry}
                  showCandidates={showCandidates}
                  colorHeld={colorHeld}
                  markNeverChosen={markNeverChosen}
                />
                {hoveredEvent && (
                  <DecisionHighlight
                    chart={chart}
                    geometry={geometry}
                    event={hoveredEvent}
                  />
                )}
                <DecisionChosen chart={chart} geometry={geometry} />
              </svg>
              {hoveredEvent && (
                <div
                  className="chart-tip"
                  style={
                    geometry.x(hoveredEvent.trial) > geometry.width - 300
                      ? {
                          right:
                            geometry.width -
                            geometry.x(hoveredEvent.trial) +
                            12,
                        }
                      : { left: geometry.x(hoveredEvent.trial) + 12 }
                  }
                >
                  <strong>{labels.event(hoveredEvent)}</strong>
                  <span>{labels.item(hoveredEvent.questionContainerId)}</span>
                  <span>{valueLabelOf(chart, hoveredEvent)}</span>
                  <span>{labels.resultOf(hoveredEvent)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="muted">{labels.hint}</p>
      <DecisionLegend chart={chart} />
    </section>
  );
};
