import type { ChartEvent, ChartPoint, DecisionChart } from "./decisionChart";

export const CHART = {
  height: 392,
  top: 44,
  plot: 240,
  axisWidth: 60,
  minSpacing: 14,
  maxSpacing: 56,
  unseenRow: 304,
  massedRow: 326,
  resultRow: 348,
  labels: 380,
  blockRows: 3,
  blockRowHeight: 12,
};

export interface ChartGeometry {
  width: number;
  spacing: number;
  x: (trial: number) => number;
  y: (value: number) => number;
  /** Null for an event with no dot above the result row. */
  yOfEvent: (event: ChartEvent) => number | null;
  trialAt: (x: number) => number;
}

export const geometryOf = (
  chart: DecisionChart,
  availableWidth: number,
): ChartGeometry => {
  const count = chart.events.length;
  const spacing = Math.min(
    CHART.maxSpacing,
    Math.max(CHART.minSpacing, availableWidth / count),
  );
  const [low, high] = chart.domain;
  const y = (value: number) =>
    CHART.top + CHART.plot * (1 - (value - low) / (high - low));
  return {
    width: Math.max(availableWidth, count * spacing),
    spacing,
    x: (trial) => (trial - 0.5) * spacing,
    y,
    yOfEvent: (event) => {
      if (event.kind === "work") return null;
      if (event.kind === "massed") return CHART.massedRow;
      return event.value === null ? CHART.unseenRow : y(event.value);
    },
    trialAt: (x) => Math.min(count, Math.max(1, Math.floor(x / spacing) + 1)),
  };
};

/** The SVG path of a question's line. It starts again where the question was not a candidate. */
export const linePathOf = (
  points: readonly ChartPoint[],
  { x, y }: ChartGeometry,
): string =>
  points
    .map(
      (point) =>
        `${point.starts ? "M" : "L"}${x(point.trial).toFixed(1)} ${y(point.value).toFixed(1)}h0`,
    )
    .join("");

/** The series of the items that no review pick of the chart chose. */
export const neverChosenSeriesOf = (chart: DecisionChart) => {
  const chosen = new Set(
    chart.events
      .filter((event) => event.pick !== null)
      .map((event) => event.questionContainerId),
  );
  return chart.series.filter(
    (series) => !chosen.has(series.questionContainerId),
  );
};

/** One dot for each candidate of each pick that the pick did not choose, as a single path of zero-length strokes. */
export const candidateDotsPathOf = (
  chart: DecisionChart,
  { x, y }: ChartGeometry,
): string => {
  const chosen = new Map(
    chart.events.map((event) => [event.trial, event.questionContainerId]),
  );
  return chart.series
    .flatMap((series) =>
      series.points
        .filter((point) => chosen.get(point.trial) !== series.questionContainerId)
        .map(
          (point) =>
            `M${x(point.trial).toFixed(1)} ${y(point.value).toFixed(1)}h0`,
        ),
    )
    .join("");
};

/** Round tick values that cover a range in about `target` steps. */
export const ticksOf = (low: number, high: number, target = 6): number[] => {
  const raw = (high - low) / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let tick = Math.ceil(low / step) * step; tick <= high + step / 1e6; tick += step)
    ticks.push(Number(tick.toFixed(10)));
  return ticks;
};

/** Every nth column has a number, so that numbers are at least 36 pixels apart. */
export const labelStepOf = (spacing: number) => {
  const least = 36 / spacing;
  return [1, 2, 5, 10, 20, 50, 100].find((step) => step >= least) ?? 100;
};

/**
 * The label row of each block, in the blocks' order. A label takes the first
 * row whose last label ends before it starts.
 */
export const labelRowsOf = (
  starts: readonly number[],
  widths: readonly number[],
): number[] => {
  const ends: number[] = Array.from({ length: CHART.blockRows }, () => -Infinity);
  return starts.map((start, index) => {
    const free = ends.findIndex((end) => end <= start);
    const row = free === -1 ? ends.indexOf(Math.min(...ends)) : free;
    ends[row] = start + widths[index];
    return row;
  });
};
