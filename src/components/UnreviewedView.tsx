import { useMemo } from "react";
import type { Dataset } from "../data/dataset";
import type { TraceIndex } from "../data/traces";
import {
  unreviewedOf,
  type UnreviewedCondition,
  type UnreviewedWeek,
} from "../data/unreviewed";
import { useTargetSplit } from "../hooks/useTargetSplit";
import { DataTable, type Column } from "./DataTable";
import { Section } from "./Section";
import { TargetSplitTable } from "./TargetSplitTable";

const number = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 1 });
const share = (part: number, whole: number) =>
  whole === 0 ? "" : `${((100 * part) / whole).toFixed(1)}%`;

const conditionColumns: Column<UnreviewedCondition>[] = [
  { header: "Condition", cell: (row) => row.condition },
  { header: "Students", align: "right", cell: (row) => number(row.students) },
  {
    header: "Reviewable items per student (mean)",
    align: "right",
    cell: (row) => number(row.items),
  },
  {
    header: "Share never reviewed (mean of students)",
    align: "right",
    cell: (row) => share(row.meanShare, 1),
  },
  {
    header: "Never reviewed: mean",
    align: "right",
    cell: (row) => number(row.mean),
  },
  {
    header: "Never reviewed: median",
    align: "right",
    cell: (row) => number(row.median),
  },
  {
    header: "Never reviewed: min",
    align: "right",
    cell: (row) => number(row.min),
  },
  {
    header: "Never reviewed: max",
    align: "right",
    cell: (row) => number(row.max),
  },
];

/** How many regular items the students never reviewed: per student, by the week that introduced the item, and for Optimal against the target. */
export const UnreviewedView = ({
  dataset,
  traces,
}: {
  dataset: Dataset;
  traces: TraceIndex | null;
}) => {
  const summary = useMemo(() => unreviewedOf(dataset), [dataset]);
  const target = useTargetSplit(dataset, traces);
  const conditions = summary.conditions.map((row) => row.condition);
  return (
    <div className="grid">
      <Section
        wide
        title="Never-reviewed items per student"
        note="Counts items that the student answered in an assignment before at least one of their review sessions. Massed items are excluded."
      >
        <DataTable
          rows={summary.conditions}
          rowKey={(row) => row.condition}
          columns={conditionColumns}
        />
      </Section>
      <Section wide title="Never-reviewed items by week introduced">
        <DataTable
          rows={summary.weeks}
          rowKey={(row) => row.week}
          columns={[
            {
              header: "Study week",
              cell: (row) => `${row.number} (${row.week})`,
            },
            ...conditions.map((condition): Column<UnreviewedWeek> => ({
              header: condition,
              align: "right",
              cell: (row) => {
                const { never, items } = row.byCondition[condition];
                return items === 0
                  ? ""
                  : `${share(never, items)} (n = ${number(items)})`;
              },
            })),
          ]}
        />
      </Section>
      <Section wide title="Optimal: probability of never-reviewed items">
        <TargetSplitTable
          hasTraces={traces !== null}
          state={target.state}
          onRun={target.run}
        />
      </Section>
    </div>
  );
};
