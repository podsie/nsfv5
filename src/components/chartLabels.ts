import type { ChartEvent, DecisionChart } from "../data/decisionChart";
import { phaseLabelOf } from "./format";

const perAlgorithm = {
  optimal: {
    title: "Each item's probability of a correct answer at every review pick",
    axis: "Probability of a correct answer",
    reference: (value: number) => `Target ${value.toFixed(2)}`,
    line: "One item's probability over time",
    held: "One of the last 5 served (excluded)",
    candidate: "Item not chosen",
    showCandidates: "Show items not chosen",
    colorHeld: "Color the last 5 served",
    markNeverChosen: "Highlight items never reviewed",
    neverChosen: "Item never chosen for review",
    value: (value: number) => `Probability ${value.toFixed(4)}`,
    tick: (value: number) => value.toFixed(1),
  },
  sm2: {
    title: "Each due card's days past due at every review pick",
    axis: "Days past the due date",
    reference: () => "Due",
    line: "One card's days past due over time",
    held: "Served last (excluded)",
    candidate: "Due card not chosen",
    showCandidates: "Show due cards not chosen",
    colorHeld: "Color the card served last",
    markNeverChosen: "Highlight due cards never reviewed",
    neverChosen: "Due card never chosen for review",
    value: (value: number) => `${value.toFixed(1)} days past due`,
    tick: (value: number) => String(value),
  },
};

const results = {
  true: "Correct",
  false: "Incorrect",
  null: "No answer in the file",
};

export const CHART_LABELS = {
  of: (chart: DecisionChart) => perAlgorithm[chart.algorithm],
  chosen: "Item chosen",
  massedChosen: "Massed item",
  correct: "Correct answer",
  incorrect: "Incorrect answer",
  work: "Assignment or post test",
  unseen: "Unseen",
  massed: "Massed",
  result: "Result",
  hint: "Hover over an answer to highlight its item. Click a review pick to see how it was chosen.",
  groups: { answers: "Answers", picks: "Review picks", lines: "Lines" },
  xAxis: "Answer",
  loading: "Reading the student's decisions",
  event: (event: ChartEvent) =>
    event.pick === null
      ? `Answer ${event.trial}: ${phaseLabelOf(event.phase).toLowerCase()} ${event.sessionId}`
      : `Answer ${event.trial}: place ${event.pick.sessionPosition} of review session ${event.sessionId}`,
  item: (id: number) => `Item ${id}`,
  resultOf: (event: ChartEvent) => results[`${event.correct}`],
  cardTitle: (event: ChartEvent) =>
    `Decision for place ${event.pick?.sessionPosition} of session ${event.sessionId}`,
  block: (phase: string, at: number) =>
    `${phaseLabelOf(phase)} ${new Date(at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })}`,
};
