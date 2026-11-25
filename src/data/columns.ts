/** The columns the explorer reads. A file without one of them is refused. */
const NAMES = {
  student: "Anon Student Id",
  session: "Session Id",
  time: "Time",
  phase: "Level (Phase)",
  problem: "Problem Name",
  start: "Problem Start Time",
  outcome: "Outcome",
  input: "Input",
  classId: "Class",
  course: "CF (Experiment ID)",
  responseTime: "CF (Response Time)",
  profile: "CF (Student Profile Id)",
  enrollment: "CF (Enrollment Id)",
  week: "CF (Study Week)",
  reviewAlgorithm: "CF (Review Algorithm)",
  position: "CF (Session Position)",
  serve: "CF (Question Serve Number)",
  container: "CF (Question Container Id)",
  added: "CF (Post Test Added Massed)",
} as const;

export type ColumnKey = keyof typeof NAMES | "condition" | "schedule";
export type ColumnIndexes = Record<ColumnKey, number>;

/**
 * Finds each column by its header name. "Condition Name" appears twice: the
 * first is the student's condition, and the second is how the question is
 * scheduled.
 */
export const columnIndexesOf = (headers: string[]): ColumnIndexes => {
  const missing: string[] = [];
  const indexes = {} as ColumnIndexes;
  for (const [key, name] of Object.entries(NAMES)) {
    const index = headers.indexOf(name);
    if (index === -1) missing.push(name);
    indexes[key as ColumnKey] = index;
  }
  indexes.condition = headers.indexOf("Condition Name");
  indexes.schedule = headers.indexOf("Condition Name", indexes.condition + 1);
  if (indexes.condition === -1 || indexes.schedule === -1)
    missing.push("Condition Name (twice)");
  if (missing.length > 0)
    throw new Error(
      `This file is not an NSFv5 export. It has no column named ${missing.join(", ")}.`,
    );
  return indexes;
};
