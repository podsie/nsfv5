import type { Dataset, Session, Student } from "./dataset";
import type { TracedSession } from "./traces";

/** One student's regular items that a review could have asked: the week an assignment introduced each one, and the ones a review never asked. */
export interface StudentItems {
  /** Item id to the study week of the student's first assignment answer on it. */
  introduced: Map<number, string>;
  neverReviewed: Set<number>;
}

/**
 * The items a review could have asked the student, and the ones with no
 * review answer in the file. An item counts when an assignment introduced
 * it, it is not one of the student's massed items, and the student began a
 * review session after their first assignment answer on it.
 */
export const studentItemsOf = (
  dataset: Dataset,
  student: Student,
): StudentItems => {
  const { rows, schedules } = dataset;
  const massedSchedule = schedules.indexOf("massed");
  const first = new Map<number, { week: string; at: number }>();
  const massed = new Set<number>();
  const reviewed = new Set<number>();
  let lastReviewStart = Number.NEGATIVE_INFINITY;
  for (const index of student.sessions) {
    const session = dataset.sessions[index];
    if (session.phase === "review")
      lastReviewStart = Math.max(lastReviewStart, rows.time[session.rows[0]]);
    for (const row of session.rows) {
      const item = rows.container[row];
      if (item === -1) continue;
      if (rows.schedule[row] === massedSchedule) massed.add(item);
      if (session.phase === "review") reviewed.add(item);
      if (session.phase !== "assignment") continue;
      const known = first.get(item);
      if (known === undefined || rows.time[row] < known.at)
        first.set(item, { week: session.week, at: rows.time[row] });
    }
  }
  const introduced = new Map(
    [...first]
      .filter(([item, { at }]) => !massed.has(item) && at < lastReviewStart)
      .map(([item, { week }]) => [item, week]),
  );
  return {
    introduced,
    neverReviewed: new Set(
      [...introduced.keys()].filter((item) => !reviewed.has(item)),
    ),
  };
};

export interface UnreviewedCondition {
  condition: string;
  students: number;
  /** Items per student, mean. */
  items: number;
  /** Never-reviewed items per student. */
  mean: number;
  median: number;
  min: number;
  max: number;
  /** The mean of each student's never-reviewed share. */
  meanShare: number;
}

export interface UnreviewedWeek {
  week: string;
  /** 1 for the first study week with an assignment answer in the file. */
  number: number;
  byCondition: Record<string, { items: number; never: number }>;
}

export interface UnreviewedSummary {
  conditions: UnreviewedCondition[];
  weeks: UnreviewedWeek[];
}

const medianOf = (sorted: number[]) => {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const meanOf = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/** How many of the items a review could have asked each student never reviewed, by condition and by the week that introduced the item. */
export const unreviewedOf = (dataset: Dataset): UnreviewedSummary => {
  const perStudent = dataset.students.map((student) => ({
    condition: student.conditions[0] ?? "",
    ...studentItemsOf(dataset, student),
  }));
  const weekNames = [
    ...new Set(perStudent.flatMap((one) => [...one.introduced.values()])),
  ].sort();
  const conditionNames = [
    ...new Set(perStudent.map((one) => one.condition)),
  ].sort();
  const conditions = conditionNames.flatMap((condition) => {
    const students = perStudent
      .filter((one) => one.condition === condition)
      .map((one) => ({
        items: one.introduced.size,
        never: one.neverReviewed.size,
      }))
      .filter((one) => one.items > 0);
    if (students.length === 0) return [];
    const never = students.map((one) => one.never).sort((a, b) => a - b);
    return [
      {
        condition,
        students: students.length,
        items: meanOf(students.map((one) => one.items)),
        mean: meanOf(never),
        median: medianOf(never),
        min: never[0],
        max: never[never.length - 1],
        meanShare: meanOf(students.map((one) => one.never / one.items)),
      },
    ];
  });
  const weeks = weekNames.map((week, index) => ({
    week,
    number: index + 1,
    byCondition: Object.fromEntries(
      conditionNames.map((condition) => {
        const cell = { items: 0, never: 0 };
        for (const one of perStudent) {
          if (one.condition !== condition) continue;
          for (const [item, introducedIn] of one.introduced) {
            if (introducedIn !== week) continue;
            cell.items += 1;
            if (one.neverReviewed.has(item)) cell.never += 1;
          }
        }
        return [condition, cell];
      }),
    ),
  }));
  return { conditions, weeks };
};

/**
 * For an Optimal student's never-reviewed items, each item's probability
 * at the last saved pick that had it as a candidate. An item that no saved
 * pick had as a candidate is left out.
 */
export const lastProbabilitiesOf = (
  sessions: TracedSession[],
  neverReviewed: Set<number>,
): number[] => {
  const last = new Map<number, number>();
  const picks = sessions
    .flatMap((session) => session.picks)
    .sort((a, b) => a.pickedAt.localeCompare(b.pickedAt));
  for (const pick of picks) {
    const decision = pick.decision.algorithm;
    if (decision?.algorithm !== "optimal") continue;
    for (const candidate of decision.candidates)
      if (neverReviewed.has(candidate.questionContainerId))
        last.set(candidate.questionContainerId, candidate.probability);
  }
  return [...last.values()];
};

export interface TargetSplit {
  students: number;
  items: number;
  below: number;
  atOrAbove: number;
  /** Median probability at the last pick, of each group. Null for an empty group. */
  belowMedian: number | null;
  atOrAboveMedian: number | null;
}

/** Splits the never-reviewed items of the traced Optimal students by their probability at the last pick: below the target, or at or above it. */
export const targetSplitOf = (
  perStudent: number[][],
  target: number,
): TargetSplit => {
  const all = perStudent.flat();
  const below = all.filter((value) => value < target).sort((a, b) => a - b);
  const atOrAbove = all
    .filter((value) => value >= target)
    .sort((a, b) => a - b);
  return {
    students: perStudent.length,
    items: all.length,
    below: below.length,
    atOrAbove: atOrAbove.length,
    belowMedian: below.length === 0 ? null : medianOf(below),
    atOrAboveMedian: atOrAbove.length === 0 ? null : medianOf(atOrAbove),
  };
};

export interface NeverReviewedItem {
  item: number;
  /** The session of the student's first assignment answer on the item. Null when the file has no assignment answer on it. */
  assignment: Session | null;
  /** The time of that answer. */
  answeredAt: number | null;
  correct: boolean | null;
}

/**
 * The student's items with no review answer: every item with an assignment
 * answer, and every item in `candidates` (the items that the review picks
 * read). Massed items are left out. Sorted by the first assignment answer,
 * with the items of no assignment last.
 */
export const neverReviewedItemsOf = (
  dataset: Dataset,
  student: Student,
  candidates: number[],
): NeverReviewedItem[] => {
  const { rows, schedules } = dataset;
  const massedSchedule = schedules.indexOf("massed");
  const first = new Map<number, { session: Session; row: number }>();
  const left = new Set<number>();
  for (const index of student.sessions) {
    const session = dataset.sessions[index];
    for (const row of session.rows) {
      const item = rows.container[row];
      if (item === -1) continue;
      if (session.phase === "review" || rows.schedule[row] === massedSchedule)
        left.add(item);
      if (session.phase !== "assignment") continue;
      const known = first.get(item);
      if (known === undefined || rows.time[row] < rows.time[known.row])
        first.set(item, { session, row });
    }
  }
  const items = [...new Set([...first.keys(), ...candidates])].filter(
    (item) => !left.has(item),
  );
  return items
    .map((item) => {
      const known = first.get(item);
      if (known === undefined)
        return { item, assignment: null, answeredAt: null, correct: null };
      const answeredAt = rows.time[known.row];
      return {
        item,
        assignment: known.session,
        answeredAt,
        correct: rows.correct[known.row],
      };
    })
    .sort(
      (a, b) =>
        (a.answeredAt ?? Number.POSITIVE_INFINITY) -
          (b.answeredAt ?? Number.POSITIVE_INFINITY) || a.item - b.item,
    );
};
