import { columnIndexesOf, type ColumnIndexes } from "./columns";
import type { Dataset, Rows, Session, Student } from "./dataset";
import { markUnanswered } from "./assignments";
import { runChecks } from "./checks";
import { scanLines } from "./scanLines";

const RETURN = 13;

/** Reads "2026-01-06 14:00:28.840" as UTC milliseconds. */
export const timeOf = (text: string): number =>
  Date.UTC(
    Number(text.slice(0, 4)),
    Number(text.slice(5, 7)) - 1,
    Number(text.slice(8, 10)),
    Number(text.slice(11, 13)),
    Number(text.slice(14, 16)),
    Number(text.slice(17, 19)),
    Number(text.slice(20, 23) || 0),
  );

const emptyRows = (): Rows => ({
  offset: [],
  length: [],
  student: [],
  session: [],
  time: [],
  schedule: [],
  correct: [],
  container: [],
  serve: [],
  responseTime: [],
  hasStart: [],
  added: [],
});

class Builder {
  headers: string[] = [];
  private at: ColumnIndexes | null = null;
  private rows = emptyRows();
  private students: Student[] = [];
  private sessions: Session[] = [];
  private schedules: string[] = [];
  private studentByKey = new Map<string, number>();
  private sessionByKey = new Map<string, number>();
  private decoder = new TextDecoder();

  line(bytes: Uint8Array, offset: number) {
    const end =
      bytes.length > 0 && bytes[bytes.length - 1] === RETURN
        ? bytes.length - 1
        : bytes.length;
    if (end === 0) return;
    const values = this.decoder.decode(bytes.subarray(0, end)).split("\t");
    if (this.at === null) {
      this.headers = values;
      this.at = columnIndexesOf(values);
      return;
    }
    this.row(values, this.at, offset, end);
  }

  private row(v: string[], at: ColumnIndexes, offset: number, length: number) {
    const student = this.studentOf(v, at);
    const session = this.sessionOf(v, at, student);
    const row = this.rows.offset.length;
    const correct = v[at.outcome] === "CORRECT";
    let schedule = this.schedules.indexOf(v[at.schedule]);
    if (schedule === -1) schedule = this.schedules.push(v[at.schedule]) - 1;
    const { rows } = this;
    rows.offset.push(offset);
    rows.length.push(length);
    rows.student.push(student.index);
    rows.session.push(session.index);
    rows.time.push(timeOf(v[at.time]));
    rows.schedule.push(schedule);
    rows.correct.push(correct);
    rows.container.push(v[at.container] === "" ? -1 : Number(v[at.container]));
    rows.serve.push(Number(v[at.serve] || 0));
    rows.responseTime.push(
      v[at.responseTime] === "" ? -1 : Number(v[at.responseTime]),
    );
    rows.hasStart.push(v[at.start] !== "");
    rows.added.push(v[at.added]);
    session.rows.push(row);
    if (correct) session.correct += 1;
    if (!student.conditions.includes(v[at.condition]))
      student.conditions.push(v[at.condition]);
  }

  private studentOf(v: string[], at: ColumnIndexes): Student {
    const key = `${v[at.course]}|${v[at.student]}`;
    const found = this.studentByKey.get(key);
    if (found !== undefined) return this.students[found];
    const student: Student = {
      index: this.students.length,
      anonId: v[at.student],
      courseId: v[at.course],
      classId: v[at.classId],
      enrollmentId: v[at.enrollment],
      profileId: v[at.profile],
      conditions: [],
      sessions: [],
    };
    this.studentByKey.set(key, student.index);
    this.students.push(student);
    return student;
  }

  private sessionOf(v: string[], at: ColumnIndexes, student: Student): Session {
    const key = `${student.index}|${v[at.session]}`;
    const found = this.sessionByKey.get(key);
    if (found !== undefined) return this.sessions[found];
    const session: Session = {
      index: this.sessions.length,
      student: student.index,
      sessionId: v[at.session],
      phase: v[at.phase],
      week: v[at.week],
      reviewAlgorithm: v[at.reviewAlgorithm],
      rows: [],
      correct: 0,
      issues: [],
      unanswered: null,
      assignmentQuestions: null,
    };
    this.sessionByKey.set(key, session.index);
    this.sessions.push(session);
    student.sessions.push(session.index);
    return session;
  }

  finish(blob: Blob, fileName: string): Dataset {
    if (this.at === null) throw new Error("The file is empty.");
    return {
      fileName,
      blob,
      headers: this.headers,
      rowCount: this.rows.offset.length,
      rows: this.rows,
      students: this.students,
      sessions: this.sessions,
      schedules: this.schedules,
      checks: [],
    };
  }
}

/**
 * Reads the file as a stream and keeps one small record per row. The row's
 * text stays in the file. readRows reads it again when a session is opened.
 */
export const loadTsv = async (
  blob: Blob,
  fileName: string,
  onProgress: (fraction: number) => void = () => {},
): Promise<Dataset> => {
  const builder = new Builder();
  await scanLines(blob, (bytes, offset) => builder.line(bytes, offset), onProgress);
  const dataset = builder.finish(blob, fileName);
  markUnanswered(dataset);
  dataset.checks = runChecks(dataset);
  return dataset;
};

/** Reads the full text of the given rows from the file, one array of column values per row. */
export const readRows = async (
  dataset: Dataset,
  rows: number[],
): Promise<string[][]> =>
  Promise.all(
    rows.map(async (row) => {
      const start = dataset.rows.offset[row];
      const text = await dataset.blob
        .slice(start, start + dataset.rows.length[row])
        .text();
      return text.split("\t");
    }),
  );
