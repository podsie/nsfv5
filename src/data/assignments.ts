import type { Dataset } from "./dataset";

/**
 * An assignment session id names the class's copy of an assignment, so every
 * student of the class has the same one. The assignment's questions are the
 * containers that any student of the class answered in it.
 */
const containersByAssignment = (dataset: Dataset) => {
  const containers = new Map<string, Set<number>>();
  for (const session of dataset.sessions) {
    if (session.phase !== "assignment") continue;
    const set = containers.get(session.sessionId) ?? new Set<number>();
    for (const row of session.rows) set.add(dataset.rows.container[row]);
    containers.set(session.sessionId, set);
  }
  return containers;
};

/** Writes, on each assignment session, the assignment's questions that the student did not answer. */
export const markUnanswered = (dataset: Dataset): void => {
  const containers = containersByAssignment(dataset);
  for (const session of dataset.sessions) {
    if (session.phase !== "assignment") continue;
    const all = containers.get(session.sessionId)!;
    const answered = new Set(
      session.rows.map((row) => dataset.rows.container[row]),
    );
    session.assignmentQuestions = all.size;
    session.unanswered = [...all]
      .filter((container) => !answered.has(container))
      .sort((a, b) => a - b);
  }
};

/**
 * Counts of student assignments: those with an answer, those with a question
 * left unanswered, and those where a student of the class has no answer at
 * all. A student belongs to the class of their rows.
 */
export const assignmentTotalsOf = (dataset: Dataset) => {
  const assignmentsByClass = new Map<string, Set<string>>();
  let sessions = 0;
  let unfinished = 0;
  for (const session of dataset.sessions) {
    if (session.phase !== "assignment") continue;
    sessions += 1;
    if (session.unanswered!.length > 0) unfinished += 1;
    const { classId } = dataset.students[session.student];
    assignmentsByClass.set(
      classId,
      (assignmentsByClass.get(classId) ?? new Set()).add(session.sessionId),
    );
  }
  let expected = 0;
  for (const student of dataset.students)
    expected += assignmentsByClass.get(student.classId)?.size ?? 0;
  return { sessions, unfinished, untouched: expected - sessions };
};
