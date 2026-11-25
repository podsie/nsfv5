import type { DecisionChart } from "../data/decisionChart";
import { CHART_LABELS as labels } from "./chartLabels";

const Key = ({ kind, label }: { kind: string; label: string }) => (
  <span>
    <i className={`chart-key chart-key-${kind}`} /> {label}
  </span>
);

/** What each mark of the chart means, in three groups. */
export const DecisionLegend = ({ chart }: { chart: DecisionChart }) => {
  const text = labels.of(chart);
  return (
    <dl className="chart-legend">
      <dt>{labels.groups.answers}</dt>
      <dd>
        <Key kind="work" label={labels.work} />
        <Key kind="correct" label={labels.correct} />
        <Key kind="incorrect" label={labels.incorrect} />
      </dd>
      <dt>{labels.groups.picks}</dt>
      <dd>
        <Key kind="chosen" label={labels.chosen} />
        <Key kind="massed" label={labels.massedChosen} />
        <Key kind="held" label={text.held} />
        <Key kind="candidate" label={text.candidate} />
      </dd>
      <dt>{labels.groups.lines}</dt>
      <dd>
        <Key kind="line" label={text.line} />
        <Key kind="never" label={text.neverChosen} />
        <Key kind="reference" label={text.reference(chart.reference)} />
      </dd>
    </dl>
  );
};
