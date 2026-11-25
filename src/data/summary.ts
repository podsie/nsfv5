import { assignmentTotalsOf } from "./assignments";
import type { Dataset } from "./dataset";

export interface Cell {
  answers: number;
  correct: number;
  students: number;
}

export interface SummaryRow extends Cell {
  key: string;
  labels: string[];
}

/** One column of the percent-correct tables: a condition, with every answer or the answers of one second condition. */
export interface AccuracyGroup {
  key: string;
  condition: string;
  /** A value of the file's second Condition Name column. Null for every answer of the condition. */
  second: string | null;
}

/** One row of a percent-correct table: a phase or a study week, with a cell for each group. */
export interface AccuracyRow {
  label: string;
  byGroup: Record<string, Cell>;
}

export interface Summary {
  students: number;
  classes: number;
  courses: number;
  sessions: number;
  byCondition: SummaryRow[];
  groups: AccuracyGroup[];
  byPhase: AccuracyRow[];
  reviewWeeks: AccuracyRow[];
  assignments: { sessions: number; unfinished: number; untouched: number };
}

class Groups {
  private cells = new Map<
    string,
    { labels: string[]; answers: number; correct: number; who: Set<number> }
  >();
  add(labels: string[], student: number, correct: boolean) {
    const key = labels.join("|");
    const cell = this.cells.get(key) ?? {
      labels,
      answers: 0,
      correct: 0,
      who: new Set<number>(),
    };
    cell.answers += 1;
    if (correct) cell.correct += 1;
    cell.who.add(student);
    this.cells.set(key, cell);
  }
  rows(): SummaryRow[] {
    return [...this.cells.entries()]
      .map(([key, cell]) => ({
        key,
        labels: cell.labels,
        answers: cell.answers,
        correct: cell.correct,
        students: cell.who.size,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }
}

const ALL = "";
const groupKeyOf = (condition: string, second: string) =>
  `${condition}|${second}`;

/** The cells of `cells` as rows, one for each first label, in the order of `order`. */
const accuracyRowsOf = (cells: SummaryRow[], order: string[]): AccuracyRow[] =>
  order
    .filter((label) => cells.some((cell) => cell.labels[0] === label))
    .map((label) => ({
      label,
      byGroup: Object.fromEntries(
        cells
          .filter((cell) => cell.labels[0] === label)
          .map((cell) => [groupKeyOf(cell.labels[1], cell.labels[2]), cell]),
      ),
    }));

const PHASES = ["assignment", "review", "posttest1", "posttest2"];

/** Counts of answers, right answers, and students for the whole file. */
export const summaryOf = (dataset: Dataset): Summary => {
  const { rows, sessions, students, schedules } = dataset;
  const byCondition = new Groups();
  const byPhase = new Groups();
  const byWeek = new Groups();
  const seen = new Map<string, AccuracyGroup>();
  for (const session of sessions) {
    const condition = students[session.student].conditions[0] ?? "";
    for (const row of session.rows) {
      const second = schedules[rows.schedule[row]];
      const correct = rows.correct[row];
      byCondition.add([condition], session.student, correct);
      for (const part of [ALL, second]) {
        const key = groupKeyOf(condition, part);
        if (!seen.has(key))
          seen.set(key, { key, condition, second: part === ALL ? null : part });
        byPhase.add([session.phase, condition, part], session.student, correct);
        if (session.phase === "review")
          byWeek.add([session.week, condition, part], session.student, correct);
      }
    }
  }
  const rank = (group: AccuracyGroup) =>
    group.second === null ? 0 : group.second === "massed" ? 2 : 1;
  const weekCells = byWeek.rows();
  return {
    students: students.length,
    classes: new Set(students.map((student) => student.classId)).size,
    courses: new Set(students.map((student) => student.courseId)).size,
    sessions: sessions.length,
    byCondition: byCondition.rows(),
    groups: [...seen.values()].sort(
      (a, b) => a.condition.localeCompare(b.condition) || rank(a) - rank(b),
    ),
    byPhase: accuracyRowsOf(byPhase.rows(), [
      ...PHASES,
      ...byPhase
        .rows()
        .map((cell) => cell.labels[0])
        .filter((phase) => !PHASES.includes(phase)),
    ]),
    reviewWeeks: accuracyRowsOf(
      weekCells,
      [...new Set(weekCells.map((cell) => cell.labels[0]))].sort(),
    ),
    assignments: assignmentTotalsOf(dataset),
  };
};

export const percentOf = (correct: number, answers: number): string =>
  answers === 0 ? "" : `${Math.round((100 * correct) / answers)}%`;
