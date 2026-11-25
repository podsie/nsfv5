import type {
  CheckResult,
  CountSpread,
  Dataset,
  Severity,
  Student,
} from "./dataset";
import {
  isPostTest,
  POST_TEST_MASSED_COUNT,
  unseenPostTestQuestionsOf,
} from "./postTest";
import { STUDY_WEEKS } from "./studyWeeks";

interface CheckDefinition {
  id: string;
  label: string;
  severity: Severity;
  unit: string;
}

/** The study rules the explorer tests. Each one names the sessions that break it. */
export const CHECKS: CheckDefinition[] = [
  {
    id: "two-conditions",
    label: "A student has one condition",
    severity: "error",
    unit: "students",
  },
  {
    id: "wrong-algorithm",
    label:
      "Review questions are picked by the algorithm of the student's condition",
    severity: "error",
    unit: "answers",
  },
  {
    id: "massed-over-5",
    label: "A massed question is answered at most 5 times",
    severity: "error",
    unit: "questions",
  },
  {
    id: "massed-two-sessions",
    label: "A massed question is massed in only one session",
    severity: "error",
    unit: "questions",
  },
  {
    id: "massed-and-picked",
    label: "The algorithm never picks the student's massed question",
    severity: "error",
    unit: "questions",
  },
  {
    id: "two-massed-sessions",
    label: "A student has one massed session per study week",
    severity: "error",
    unit: "student weeks",
  },
  {
    id: "assignment-repeat",
    label: "A student answers each item of an assignment once",
    severity: "error",
    unit: "items",
  },
  {
    id: "post-test-repeat",
    label: "A student answers each question of a post test once",
    severity: "error",
    unit: "questions",
  },
  {
    id: "no-start-time",
    label: "Every answer has a start time",
    severity: "error",
    unit: "answers",
  },
  {
    id: "massed-under-5",
    label: "Massed questions answered fewer than 5 times",
    severity: "notice",
    unit: "questions",
  },
  {
    id: "post-test-unseen",
    label:
      "Post test questions the student never answered in an assignment or a review",
    severity: "notice",
    unit: "unanswered questions",
  },
  {
    id: "post-test-few-massed",
    label: "Students with fewer than 10 massed questions in their post tests",
    severity: "notice",
    unit: "students",
  },
  {
    id: "review-weeks-short",
    label: `Students who reviewed in fewer than ${STUDY_WEEKS} study weeks`,
    severity: "notice",
    unit: "weeks with review answers",
  },
  {
    id: "over-an-hour",
    label: "Answers that took over one hour",
    severity: "notice",
    unit: "answers",
  },
];

const ALGORITHM_SCHEDULE: Record<string, string> = {
  supermemo2: "sm2",
  optimal: "optimal_algo",
};

const spreadOf = (counts: number[]): CountSpread => {
  const sorted = [...counts].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    enrollments: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((sum, count) => sum + count, 0) / sorted.length,
    median:
      sorted.length % 2 === 1
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2,
  };
};

class Tally {
  counts = new Map<string, number>();
  sessions = new Map<string, Set<number>>();
  enrollmentCounts = new Map<string, number[]>();
  /** Adds one enrollment's count to a check that is counted per enrollment. */
  addEnrollment(id: string, sessions: Iterable<number>, count: number) {
    this.add(id, sessions, 0);
    this.enrollmentCounts.set(id, [
      ...(this.enrollmentCounts.get(id) ?? []),
      count,
    ]);
  }
  add(id: string, sessions: Iterable<number>, count = 1) {
    this.counts.set(id, (this.counts.get(id) ?? 0) + count);
    const set = this.sessions.get(id) ?? new Set<number>();
    for (const session of sessions) set.add(session);
    this.sessions.set(id, set);
  }
}

const sessionsOf = (rows: number[], dataset: Dataset) =>
  new Set(rows.map((row) => dataset.rows.session[row]));

const checkStudent = (dataset: Dataset, student: Student, tally: Tally) => {
  const sessions = student.sessions.map((index) => dataset.sessions[index]);
  const { conditions } = student;
  const { rows, schedules } = dataset;
  const massed = schedules.indexOf("massed");
  const expected = schedules.indexOf(ALGORITHM_SCHEDULE[conditions[0]] ?? "");
  const massedRows = new Map<number, number[]>();
  const pickedRows = new Map<number, number[]>();
  const postTestRows = new Map<string, number[]>();
  const assignmentRows = new Map<string, number[]>();
  const massedSessionsByWeek = new Map<string, Set<number>>();
  const push = <K>(map: Map<K, number[]>, key: K, row: number) =>
    map.set(key, [...(map.get(key) ?? []), row]);

  if (conditions.length > 1)
    tally.add(
      "two-conditions",
      sessions.map((session) => session.index),
    );
  for (const session of sessions) {
    for (const row of session.rows) {
      if (!rows.hasStart[row]) tally.add("no-start-time", [session.index]);
      if (rows.responseTime[row] > 3600)
        tally.add("over-an-hour", [session.index]);
      const container = rows.container[row];
      if (isPostTest(session.phase))
        push(postTestRows, `${session.phase}|${container}`, row);
      if (session.phase === "assignment")
        push(assignmentRows, `${session.sessionId}|${container}`, row);
      if (session.phase !== "review") continue;
      if (rows.schedule[row] !== massed) {
        push(pickedRows, container, row);
        if (rows.schedule[row] !== expected)
          tally.add("wrong-algorithm", [session.index]);
        continue;
      }
      push(massedRows, container, row);
      const inWeek = massedSessionsByWeek.get(session.week) ?? new Set();
      massedSessionsByWeek.set(session.week, inWeek.add(session.index));
    }
  }
  for (const [container, answered] of massedRows) {
    const inSessions = sessionsOf(answered, dataset);
    if (answered.length > 5) tally.add("massed-over-5", inSessions);
    if (answered.length < 5) tally.add("massed-under-5", inSessions);
    if (inSessions.size > 1) tally.add("massed-two-sessions", inSessions);
    const picked = pickedRows.get(container);
    if (picked !== undefined)
      tally.add("massed-and-picked", sessionsOf(picked, dataset));
  }
  for (const inWeek of massedSessionsByWeek.values())
    if (inWeek.size > 1) tally.add("two-massed-sessions", inWeek);
  for (const answered of assignmentRows.values())
    if (answered.length > 1)
      tally.add("assignment-repeat", sessionsOf(answered, dataset));
  for (const answered of postTestRows.values())
    if (answered.length > 1)
      tally.add("post-test-repeat", sessionsOf(answered, dataset));
  const reviewWeeks = new Set(
    sessions
      .filter((session) => session.phase === "review")
      .map((session) => session.week),
  );
  if (reviewWeeks.size < STUDY_WEEKS)
    tally.addEnrollment("review-weeks-short", [], reviewWeeks.size);
  const postTests = sessions.filter((session) => isPostTest(session.phase));
  const unseen = unseenPostTestQuestionsOf(dataset, student);
  if (unseen.length > 0)
    tally.addEnrollment("post-test-unseen", [], unseen.length);
  if (postTests.length > 0 && massedRows.size < POST_TEST_MASSED_COUNT)
    tally.add(
      "post-test-few-massed",
      postTests.map((session) => session.index),
    );
};

/** Runs every check, writes the broken check ids on each session, and returns the results. */
export const runChecks = (dataset: Dataset): CheckResult[] => {
  const tally = new Tally();
  for (const student of dataset.students) checkStudent(dataset, student, tally);
  for (const session of dataset.sessions) session.issues = [];
  return CHECKS.map((check) => {
    const sessions = [...(tally.sessions.get(check.id) ?? [])];
    for (const index of sessions) dataset.sessions[index].issues.push(check.id);
    const perEnrollment = tally.enrollmentCounts.get(check.id);
    return {
      ...check,
      count: perEnrollment?.length ?? tally.counts.get(check.id) ?? 0,
      sessions,
      ...(perEnrollment && { perEnrollment: spreadOf(perEnrollment) }),
    };
  });
};

export const checkOf = (id: string) => CHECKS.find((check) => check.id === id);
