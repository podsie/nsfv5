import { CHART, linePathOf, type ChartGeometry } from "../data/chartGeometry";
import type { ChartEvent, DecisionChart } from "../data/decisionChart";

/** The line and every answer of the question that the pointer is on. */
export const DecisionHighlight = ({
  chart,
  geometry,
  event,
}: {
  chart: DecisionChart;
  geometry: ChartGeometry;
  event: ChartEvent;
}) => {
  const series = chart.series.find(
    (one) => one.questionContainerId === event.questionContainerId,
  );
  return (
    <g className="chart-highlight">
      {series && <path d={linePathOf(series.points, geometry)} />}
      {chart.events
        .filter((one) => one.questionContainerId === event.questionContainerId)
        .map((one) => (
          <circle
            key={one.trial}
            cx={geometry.x(one.trial)}
            cy={geometry.yOfEvent(one) ?? CHART.resultRow}
            r={7}
          />
        ))}
    </g>
  );
};
