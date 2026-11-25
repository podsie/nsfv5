import type { Dataset, Session, Student } from "./dataset";

export interface Filters {
  condition: string;
  phase: string;
  week: string;
  /** A check id, "any" for a session that breaks any check, or "". */
  check: string;
  /** Part of an anonymous student id, an enrollment id, or a profile id. */
  search: string;
  /** Only assignment sessions where the student left a question unanswered. */
  unfinishedOnly: boolean;
  /** Only students with saved decisions. */
  tracedOnly: boolean;
}

export const NO_FILTERS: Filters = {
  condition: "",
  phase: "",
  week: "",
  check: "",
  search: "",
  tracedOnly: false,
  unfinishedOnly: false,
};

export const isUnfinished = (session: Session) =>
  session.unanswered !== null && session.unanswered.length > 0;

export interface Totals {
  students: number;
  sessions: number;
  answers: number;
  correct: number;
  flagged: number;
}

export type TreeItem =
  | { kind: "course"; key: string; depth: 0; courseId: string; totals: Totals }
  | { kind: "class"; key: string; depth: 1; classId: string; totals: Totals }
  | { kind: "student"; key: string; depth: 2; student: Student; totals: Totals }
  | { kind: "session"; key: string; depth: 3; session: Session };

const sessionPasses = (session: Session, filters: Filters) => {
  if (filters.unfinishedOnly && !isUnfinished(session)) return false;
  if (filters.phase !== "" && session.phase !== filters.phase) return false;
  if (filters.week !== "" && session.week !== filters.week) return false;
  if (filters.check === "any") return session.issues.length > 0;
  return filters.check === "" || session.issues.includes(filters.check);
};

const studentPasses = (
  student: Student,
  filters: Filters,
  traced: ReadonlySet<string>,
) => {
  if (filters.tracedOnly && !traced.has(student.enrollmentId)) return false;
  if (
    filters.condition !== "" &&
    !student.conditions.includes(filters.condition)
  )
    return false;
  const search = filters.search.trim().toLowerCase();
  return (
    search === "" ||
    student.anonId.toLowerCase().includes(search) ||
    student.enrollmentId === search ||
    student.profileId.toLowerCase().includes(search)
  );
};

const emptyTotals = (): Totals => ({
  students: 0,
  sessions: 0,
  answers: 0,
  correct: 0,
  flagged: 0,
});

const addTotals = (to: Totals, from: Totals) => {
  to.students += from.students;
  to.sessions += from.sessions;
  to.answers += from.answers;
  to.correct += from.correct;
  to.flagged += from.flagged;
};

interface StudentNode {
  student: Student;
  sessions: Session[];
  totals: Totals;
}
interface ClassNode {
  classId: string;
  students: StudentNode[];
  totals: Totals;
}
export interface CourseNode {
  courseId: string;
  classes: ClassNode[];
  totals: Totals;
}

const byNumber = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

/** The course, class, student, and session nodes that pass the filters, with their counts. */
export const treeOf = (
  dataset: Dataset,
  filters: Filters,
  traced: ReadonlySet<string> = new Set(),
): CourseNode[] => {
  const courses = new Map<string, Map<string, StudentNode[]>>();
  for (const student of dataset.students) {
    if (!studentPasses(student, filters, traced)) continue;
    const sessions = student.sessions
      .map((index) => dataset.sessions[index])
      .filter((session) => sessionPasses(session, filters));
    if (sessions.length === 0) continue;
    const totals = emptyTotals();
    totals.students = 1;
    for (const session of sessions) {
      totals.sessions += 1;
      totals.answers += session.rows.length;
      totals.correct += session.correct;
      if (session.issues.length > 0) totals.flagged += 1;
    }
    const classes = courses.get(student.courseId) ?? new Map();
    classes.set(student.classId, [
      ...(classes.get(student.classId) ?? []),
      { student, sessions, totals },
    ]);
    courses.set(student.courseId, classes);
  }
  return [...courses.entries()]
    .sort(([a], [b]) => byNumber(a, b))
    .map(([courseId, classes]) => {
      const courseTotals = emptyTotals();
      const classNodes = [...classes.entries()]
        .sort(([a], [b]) => byNumber(a, b))
        .map(([classId, students]) => {
          const totals = emptyTotals();
          for (const node of students) addTotals(totals, node.totals);
          addTotals(courseTotals, totals);
          return { classId, students, totals };
        });
      return { courseId, classes: classNodes, totals: courseTotals };
    });
};

/** The visible lines of the tree: a node's children follow it when its key is in `open`. */
export const flattenTree = (
  courses: CourseNode[],
  open: ReadonlySet<string>,
): TreeItem[] => {
  const items: TreeItem[] = [];
  for (const course of courses) {
    const courseKey = `course:${course.courseId}`;
    items.push({
      kind: "course",
      key: courseKey,
      depth: 0,
      courseId: course.courseId,
      totals: course.totals,
    });
    if (!open.has(courseKey)) continue;
    for (const group of course.classes) {
      const classKey = `class:${course.courseId}:${group.classId}`;
      items.push({
        kind: "class",
        key: classKey,
        depth: 1,
        classId: group.classId,
        totals: group.totals,
      });
      if (!open.has(classKey)) continue;
      for (const node of group.students) {
        const studentKey = `student:${node.student.index}`;
        items.push({
          kind: "student",
          key: studentKey,
          depth: 2,
          student: node.student,
          totals: node.totals,
        });
        if (!open.has(studentKey)) continue;
        for (const session of node.sessions)
          items.push({
            kind: "session",
            key: `session:${session.index}`,
            depth: 3,
            session,
          });
      }
    }
  }
  return items;
};

/** The keys of every course and class node, and of every student node when `withStudents` is true. */
export const branchKeysOf = (
  courses: CourseNode[],
  withStudents: boolean,
): string[] =>
  courses.flatMap((course) => [
    `course:${course.courseId}`,
    ...course.classes.flatMap((group) => [
      `class:${course.courseId}:${group.classId}`,
      ...(withStudents
        ? group.students.map((node) => `student:${node.student.index}`)
        : []),
    ]),
  ]);

export const filterOptionsOf = (dataset: Dataset) => ({
  conditions: [
    ...new Set(dataset.students.flatMap((student) => student.conditions)),
  ].sort(),
  phases: [...new Set(dataset.sessions.map((session) => session.phase))].sort(),
  weeks: [...new Set(dataset.sessions.map((session) => session.week))].sort(),
});

/** The keys that open the tree down to the sessions of the student with this enrollment id. Empty when the file has no such student. */
export const branchKeysToStudent = (
  dataset: Dataset,
  enrollmentId: string | null,
): string[] => {
  const student = dataset.students.find(
    (known) => known.enrollmentId === enrollmentId,
  );
  return student === undefined
    ? []
    : [
        `course:${student.courseId}`,
        `class:${student.courseId}:${student.classId}`,
        `student:${student.index}`,
      ];
};
