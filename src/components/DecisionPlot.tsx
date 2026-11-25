import { memo } from "react";
import {
  candidateDotsPathOf,
  CHART,
  labelRowsOf,
  labelStepOf,
  linePathOf,
  neverChosenSeriesOf,
  ticksOf,
  type ChartGeometry,
} from "../data/chartGeometry";
import type { DecisionChart } from "../data/decisionChart";
import { CHART_LABELS as labels } from "./chartLabels";

const colorOf = (index: number) => `hsl(${(index * 137.5) % 360} 70% 50%)`;
const BLOCK_TOP = CHART.top - 6;
const BLOCK_HEIGHT = CHART.resultRow + 12 - BLOCK_TOP;

/** The parts of the chart that do not change while the pointer moves. */
export const DecisionPlot = memo(
  ({
    chart,
    geometry,
    showCandidates,
    colorHeld,
    markNeverChosen,
  }: {
    chart: DecisionChart;
    geometry: ChartGeometry;
    showCandidates: boolean;
    colorHeld: boolean;
    markNeverChosen: boolean;
  }) => {
    const { x, y, width, spacing } = geometry;
    const step = labelStepOf(spacing);
    const reference = y(chart.reference);
    const blockX = chart.blocks.map(
      (block) => x(block.firstTrial) - spacing / 2,
    );
    const blockText = chart.blocks.map((block) =>
      labels.block(block.phase, block.at),
    );
    const blockRows = labelRowsOf(
      blockX,
      blockText.map((text) => text.length * 7 + 14),
    );
    return (
      <>
        {chart.blocks.map((block, index) => (
          <g
            key={block.firstTrial}
            className={
              block.phase === "review"
                ? "chart-block"
                : "chart-block chart-block-work"
            }
          >
            <rect
              x={blockX[index]}
              y={BLOCK_TOP}
              width={block.count * spacing}
              height={BLOCK_HEIGHT}
            />
            <line
              x1={blockX[index]}
              x2={blockX[index]}
              y1={BLOCK_TOP - 30}
              y2={BLOCK_TOP + BLOCK_HEIGHT}
            />
            <text
              x={blockX[index] + 4}
              y={10 + blockRows[index] * CHART.blockRowHeight}
            >
              {blockText[index]}
            </text>
          </g>
        ))}
        {ticksOf(...chart.domain).map((tick) => (
          <line
            key={tick}
            className="chart-grid"
            x1={0}
            x2={width}
            y1={y(tick)}
            y2={y(tick)}
          />
        ))}
        {[
          CHART.massedRow,
          CHART.resultRow,
          ...(chart.algorithm === "sm2" ? [CHART.unseenRow] : []),
        ].map((row) => (
          <line
            key={row}
            className="chart-row"
            x1={0}
            x2={width}
            y1={row}
            y2={row}
          />
        ))}
        {chart.series.map((series, index) => (
          <path
            key={series.questionContainerId}
            className="chart-line"
            stroke={colorOf(index)}
            d={linePathOf(series.points, geometry)}
          />
        ))}
        {markNeverChosen &&
          neverChosenSeriesOf(chart).map((series) => (
            <path
              key={series.questionContainerId}
              className="chart-line-never"
              d={linePathOf(series.points, geometry)}
            />
          ))}
        {showCandidates && (
          <path
            className="chart-candidates"
            d={candidateDotsPathOf(chart, geometry)}
          />
        )}
        <line
          className="chart-reference"
          x1={0}
          x2={width}
          y1={reference}
          y2={reference}
        />
        {colorHeld &&
          chart.series.flatMap((series) =>
            series.points
              .filter((point) => point.held)
              .map((point) => (
                <circle
                  key={`${series.questionContainerId}:${point.trial}`}
                  className="chart-held"
                  cx={x(point.trial)}
                  cy={y(point.value)}
                  r={2.5}
                />
              )),
          )}
        {chart.events
          .filter((event) => event.correct !== null)
          .map((event) => (
            <circle
              key={event.trial}
              className={`chart-result chart-result-${event.correct}`}
              cx={x(event.trial)}
              cy={CHART.resultRow}
              r={4}
            />
          ))}
        {chart.events
          .filter((event) => event.trial % step === 0 || event.trial === 1)
          .map((event) => (
            <text
              key={event.trial}
              className="chart-text"
              textAnchor="middle"
              x={x(event.trial)}
              y={CHART.labels}
            >
              {event.trial}
            </text>
          ))}
      </>
    );
  },
);
