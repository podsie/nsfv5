import { useMemo } from "react";
import type { Dataset } from "../data/dataset";
import type { TraceIndex } from "../data/traces";
import {
  percentOf,
  summaryOf,
  type AccuracyRow,
  type Cell,
} from "../data/summary";
import { DataTable, type Column } from "./DataTable";
import { phaseLabelOf } from "./format";
import { Section } from "./Section";
import { Stat } from "./Stat";
import { UnreviewedView } from "./UnreviewedView";

const number = (n: number) => n.toLocaleString("en-US");

const KINDS = [
  { massed: false, label: "non-massed" },
  { massed: true, label: "massed" },
];

const accuracyCellOf = (cell: Cell | undefined) =>
  cell === undefined
    ? ""
    : `${percentOf(cell.correct, cell.answers)} (n = ${number(cell.answers)})`;

export const SummaryView = ({
  dataset,
  traces,
}: {
  dataset: Dataset;
  traces: TraceIndex | null;
}) => {
  const summary = useMemo(() => summaryOf(dataset), [dataset]);
  const split = summary.groups.filter((group) => group.second !== null);
  const groupOf = (condition: string, massed: boolean) =>
    split.find(
      (group) =>
        group.condition === condition && (group.second === "massed") === massed,
    );
  const conditions = [...new Set(split.map((group) => group.condition))];
  const phaseColumns = summary.byPhase.flatMap((phase) =>
    KINDS.map((kind): Column<string> => ({
      header: `${phaseLabelOf(phase.label)}: ${kind.label}`,
      align: "right",
      cell: (condition) =>
        accuracyCellOf(
          phase.byGroup[groupOf(condition, kind.massed)?.key ?? ""],
        ),
    })),
  );
  const weekColumns = conditions.flatMap((condition) =>
    KINDS.map((kind): Column<AccuracyRow> => ({
      header: `${condition}: ${kind.label}`,
      align: "right",
      cell: (row) =>
        accuracyCellOf(row.byGroup[groupOf(condition, kind.massed)?.key ?? ""]),
    })),
  );
  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Answers" value={number(dataset.rowCount)} />
        <Stat label="Students" value={number(summary.students)} />
        <Stat label="Classes" value={number(summary.classes)} />
        <Stat label="Courses" value={number(summary.courses)} />
        <Stat label="Sessions" value={number(summary.sessions)} />
      </div>
      <div className="grid">
        <Section title="Students and answers by condition">
          <DataTable
            rows={summary.byCondition}
            rowKey={(row) => row.key}
            columns={[
              { header: "Condition", cell: (row) => row.labels[0] },
              {
                header: "Students",
                align: "right",
                cell: (row) => number(row.students),
              },
              {
                header: "Answers",
                align: "right",
                cell: (row) => number(row.answers),
              },
            ]}
          />
        </Section>
        <Section wide title="Percent correct by condition">
          <DataTable
            rows={conditions}
            rowKey={(condition) => condition}
            columns={[
              { header: "Condition", cell: (condition) => condition },
              ...phaseColumns,
            ]}
          />
        </Section>
      </div>
      <UnreviewedView dataset={dataset} traces={traces} />
      <Section title="Assignment completion">
        <DataTable
          rows={[
            {
              label: "Finished",
              count:
                summary.assignments.sessions - summary.assignments.unfinished,
            },
            {
              label: "Started but not finished",
              count: summary.assignments.unfinished,
            },
            {
              label: "Not started",
              count: summary.assignments.untouched,
            },
          ]}
          rowKey={(row) => row.label}
          columns={[
            { header: "Outcome", cell: (row) => row.label },
            {
              header: "Count",
              align: "right",
              cell: (row) => number(row.count),
            },
          ]}
        />
      </Section>
      <Section title="Percent correct in review by study week">
        <DataTable
          rows={summary.reviewWeeks}
          rowKey={(row) => row.label}
          columns={[
            { header: "Study week", cell: (row) => row.label },
            ...weekColumns,
          ]}
        />
      </Section>
    </div>
  );
};
