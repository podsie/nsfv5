import { CHART, ticksOf, type ChartGeometry } from "../data/chartGeometry";
import type { DecisionChart } from "../data/decisionChart";
import { CHART_LABELS as labels } from "./chartLabels";

/** The value scale and the row names. It stays in place while the plot scrolls. */
export const DecisionAxis = ({
  chart,
  geometry,
}: {
  chart: DecisionChart;
  geometry: ChartGeometry;
}) => {
  const right = CHART.axisWidth - 6;
  const middle = CHART.top + CHART.plot / 2;
  const rows = [
    ...(chart.algorithm === "sm2"
      ? [{ at: CHART.unseenRow, text: labels.unseen }]
      : []),
    { at: CHART.massedRow, text: labels.massed },
    { at: CHART.resultRow, text: labels.result },
    { at: CHART.labels - 4, text: labels.xAxis },
  ];
  return (
    <svg className="chart-axis" width={CHART.axisWidth} height={CHART.height}>
      <text
        className="chart-text"
        textAnchor="middle"
        transform={`translate(11 ${middle}) rotate(-90)`}
      >
        {labels.of(chart).axis}
      </text>
      {ticksOf(...chart.domain).map((tick) => (
        <text
          key={tick}
          className="chart-text"
          textAnchor="end"
          x={right}
          y={geometry.y(tick) + 4}
        >
          {labels.of(chart).tick(tick)}
        </text>
      ))}
      {rows.map((row) => (
        <text
          key={row.text}
          className="chart-text"
          textAnchor="end"
          x={right}
          y={row.at + 4}
        >
          {row.text}
        </text>
      ))}
    </svg>
  );
};
