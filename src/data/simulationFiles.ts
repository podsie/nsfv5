/** Each simulation run has two files that share a name: `<name>.answers.tsv` and `<name>.decisions.jsonl`. */
export const ANSWERS_SUFFIX = ".answers.tsv";
export const DECISIONS_SUFFIX = ".decisions.jsonl";

export type FileRole = "answers" | "decisions";

/** Which of the two files a file is, by its name. Null for a name that is neither. */
export const fileRoleOf = (fileName: string): FileRole | null => {
  const name = fileName.toLowerCase();
  if (/\.(tsv|txt)$/.test(name)) return "answers";
  if (/\.(jsonl|ndjson|json)$/.test(name)) return "decisions";
  return null;
};

/** The simulation's name: the file name without its suffix. */
export const simulationNameOf = (fileName: string): string => {
  const name = fileName.toLowerCase();
  for (const suffix of [ANSWERS_SUFFIX, DECISIONS_SUFFIX])
    if (name.endsWith(suffix)) return fileName.slice(0, -suffix.length);
  return fileName.replace(/\.[^.]+$/, "");
};

export interface SortedFiles<T> {
  answers: T | null;
  decisions: T | null;
  /** The names that are neither an answers file nor a decisions file. */
  unknown: string[];
}

/** Sorts chosen or dropped files into the answers file and the decisions file, by name. */
export const sortSimulationFiles = <T extends { name: string }>(
  files: readonly T[],
): SortedFiles<T> => {
  const sorted: SortedFiles<T> = { answers: null, decisions: null, unknown: [] };
  for (const file of files) {
    const role = fileRoleOf(file.name);
    if (role === null) sorted.unknown.push(file.name);
    else sorted[role] ??= file;
  }
  return sorted;
};

/** Whether an answers file and a decisions file have the same simulation name. */
export const sameSimulation = (answers: string, decisions: string): boolean =>
  simulationNameOf(answers) === simulationNameOf(decisions);
