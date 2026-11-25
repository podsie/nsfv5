import type { Dataset } from "./dataset";

export type Selection =
  | { kind: "student"; index: number }
  | { kind: "session"; index: number }
  | null;

/** The student or the session that an enrollment id and a session id name in the file. Null when the file has no such student or session. */
export const selectionOf = (
  dataset: Dataset,
  enrollmentId: string | null,
  sessionId: string | null,
): Selection => {
  const student = dataset.students.find(
    (known) => known.enrollmentId === enrollmentId,
  );
  if (student === undefined) return null;
  if (sessionId === null) return { kind: "student", index: student.index };
  const session = student.sessions.find(
    (index) => dataset.sessions[index].sessionId === sessionId,
  );
  return session === undefined ? null : { kind: "session", index: session };
};
