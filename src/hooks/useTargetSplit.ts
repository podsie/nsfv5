import { useCallback, useState } from "react";
import type { Dataset } from "../data/dataset";
import {
  readTracedSession,
  sessionKeysOf,
  type TraceIndex,
} from "../data/traces";
import {
  lastProbabilitiesOf,
  studentItemsOf,
  targetSplitOf,
  type TargetSplit,
} from "../data/unreviewed";

export type TargetSplitState =
  | { status: "idle" }
  | { status: "running"; fraction: number }
  | { status: "done"; split: TargetSplit };

const OPTIMAL = "optimal";

/** Reads the saved picks of every traced Optimal student, when asked, and splits their never-reviewed items by the target. */
export const useTargetSplit = (dataset: Dataset, traces: TraceIndex | null) => {
  const [state, setState] = useState<TargetSplitState>({ status: "idle" });
  const run = useCallback(async () => {
    if (traces === null) return;
    const target = traces.parameters?.targetProbability ?? 0.85;
    const students = dataset.students.filter(
      (student) =>
        student.conditions[0] === OPTIMAL &&
        traces.enrollments.has(student.enrollmentId),
    );
    const perStudent: number[][] = [];
    setState({ status: "running", fraction: 0 });
    for (const [index, student] of students.entries()) {
      const sessions = await Promise.all(
        sessionKeysOf(traces, student.enrollmentId).map((key) =>
          readTracedSession(traces, key),
        ),
      );
      perStudent.push(
        lastProbabilitiesOf(
          sessions.filter((session) => session !== null),
          studentItemsOf(dataset, student).neverReviewed,
        ),
      );
      setState({ status: "running", fraction: (index + 1) / students.length });
    }
    setState({ status: "done", split: targetSplitOf(perStudent, target) });
  }, [dataset, traces]);
  return { state, run };
};
