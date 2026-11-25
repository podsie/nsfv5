import type { TargetSplitState } from "../hooks/useTargetSplit";
import { DataTable } from "./DataTable";

const share = (part: number, whole: number) =>
  whole === 0 ? "" : `${((100 * part) / whole).toFixed(1)}%`;
const probability = (value: number | null) =>
  value === null ? "" : value.toFixed(2);

/** The never-reviewed items of the Optimal students, below the target and at or above it. It reads the decisions file when asked. */
export const TargetSplitTable = ({
  hasTraces,
  state,
  onRun,
}: {
  hasTraces: boolean;
  state: TargetSplitState;
  onRun: () => void;
}) => {
  if (!hasTraces)
    return <p className="muted">This table needs a decisions file.</p>;
  if (state.status === "idle")
    return (
      <button className="button" onClick={onRun}>
        Calculate from the decisions file
      </button>
    );
  if (state.status === "running")
    return (
      <p className="muted">
        Reading the decisions file: {Math.round(state.fraction * 100)}%
      </p>
    );
  const { split } = state;
  return (
    <>
      <p className="muted">
        {split.students.toLocaleString("en-US")} traced Optimal students,{" "}
        {split.items.toLocaleString("en-US")} never-reviewed items.
      </p>
      <DataTable
        rows={[
          {
            label: "Below the target",
            items: split.below,
            median: split.belowMedian,
          },
          {
            label: "At or above the target",
            items: split.atOrAbove,
            median: split.atOrAboveMedian,
          },
        ]}
        rowKey={(row) => row.label}
        columns={[
          { header: "Probability at the last pick", cell: (row) => row.label },
          {
            header: "Items",
            align: "right",
            cell: (row) => row.items.toLocaleString("en-US"),
          },
          {
            header: "Share",
            align: "right",
            cell: (row) => share(row.items, split.items),
          },
          {
            header: "Median probability",
            align: "right",
            cell: (row) => probability(row.median),
          },
        ]}
      />
    </>
  );
};
