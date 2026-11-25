export type Severity = "error" | "notice";

export interface Rows {
  /** Byte offset and byte length of the row's line in the file. */
  offset: number[];
  length: number[];
  student: number[];
  session: number[];
  /** Answer time, in milliseconds since the epoch. */
  time: number[];
  /** Index into Dataset.schedules. */
  schedule: number[];
  correct: boolean[];
  /** Question container id, or -1 when the column is empty. */
  container: number[];
  /** Question serve number of a review row, or 0. */
  serve: number[];
  /** Response time in seconds, or -1 when the column is empty. */
  responseTime: number[];
  hasStart: boolean[];
  /** "TRUE", "FALSE" or "" from CF (Post Test Added Massed). */
  added: string[];
}

export interface Student {
  index: number;
  anonId: string;
  courseId: string;
  classId: string;
  enrollmentId: string;
  profileId: string;
  /** Every value of the first Condition Name column on the student's rows. */
  conditions: string[];
  sessions: number[];
}

export interface Session {
  index: number;
  student: number;
  sessionId: string;
  phase: string;
  /** CF (Study Week) of the session's first row. */
  week: string;
  /** CF (Review Algorithm) of the session's first row. */
  reviewAlgorithm: string;
  /** Row indexes, in file order. */
  rows: number[];
  correct: number;
  /** Ids of the checks the session breaks. */
  issues: string[];
  /**
   * For an assignment session, the question containers of the assignment that
   * the student did not answer. Null for a review or a post test session.
   */
  unanswered: number[] | null;
  /** For an assignment session, the count of the assignment's question containers in the file. */
  assignmentQuestions: number | null;
}

export interface Dataset {
  fileName: string;
  blob: Blob;
  headers: string[];
  rowCount: number;
  rows: Rows;
  students: Student[];
  sessions: Session[];
  schedules: string[];
  checks: CheckResult[];
}

export interface CheckResult {
  id: string;
  label: string;
  severity: Severity;
  /** How many things break the check, in the unit named by `unit`. For a check counted per enrollment, the number of enrollments. */
  count: number;
  unit: string;
  sessions: number[];
  /** For a check counted per enrollment: the enrollments with a count above zero, and the spread of their counts. */
  perEnrollment?: CountSpread;
}

export interface CountSpread {
  enrollments: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}
